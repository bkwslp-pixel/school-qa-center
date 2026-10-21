import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      email,
      password,
      fullName,
      position = "ครูผู้สอน",
      department = "กลุ่มงานวิชาการ",
      role = "teacher",
      schoolId,
    } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลชื่อ อีเมล และรหัสผ่านให้ครบถ้วน" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      return NextResponse.json(
        { error: "ไม่พบการตั้งค่า NEXT_PUBLIC_SUPABASE_URL" },
        { status: 500 }
      );
    }

    // Validate and sanitize schoolId (avoid invalid input syntax for type uuid like "sch-1")
    const isValidUuid = (val?: string | null) =>
      Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

    let safeSchoolId: string | null = isValidUuid(schoolId) ? schoolId : null;

    // Auto-detect real school UUID if not provided or invalid
    if (!safeSchoolId) {
      try {
        const queryClient = serviceRoleKey
          ? createClient(supabaseUrl, serviceRoleKey)
          : anonKey
          ? createClient(supabaseUrl, anonKey)
          : null;
        if (queryClient) {
          const { data: schoolRow } = await queryClient
            .from("schools")
            .select("id")
            .limit(1)
            .maybeSingle();
          if (schoolRow?.id && isValidUuid(schoolRow.id)) {
            safeSchoolId = schoolRow.id;
          }
        }
      } catch (err) {
        console.warn("Auto-detect school UUID skipped:", err);
      }
    }

    // 1. If service role key is available, use Supabase Auth Admin API
    if (serviceRoleKey) {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: userData, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email: email.trim().toLowerCase(),
          password: password.trim(),
          email_confirm: true,
          user_metadata: { full_name: fullName.trim() },
        });

      if (createErr) {
        return NextResponse.json(
          { error: createErr.message },
          { status: 400 }
        );
      }

      const newUserId = userData.user.id;

      // Upsert profile safely (supporting both id and user_id schemas)
      try {
        const { error: profErr } = await supabaseAdmin.from("profiles").upsert({
          id: newUserId,
          full_name: fullName.trim(),
          position: position.trim() || "ครูผู้สอน",
          department: department.trim() || "กลุ่มงานวิชาการ",
          school_id: safeSchoolId,
        });
        if (profErr) {
          throw profErr;
        }
      } catch (profErr) {
        // Fallback for profiles schema with user_id & display_name
        try {
          await supabaseAdmin.from("profiles").upsert({
            user_id: newUserId,
            display_name: fullName.trim(),
            email: email.trim().toLowerCase(),
          });
        } catch {
          console.warn("Profile fallback insert failed:", profErr);
        }
      }

      // Upsert user_role
      if (safeSchoolId) {
        await supabaseAdmin.from("user_roles").upsert(
          {
            user_id: newUserId,
            school_id: safeSchoolId,
            role,
          },
          { onConflict: "user_id,school_id,role" }
        );
      }

      return NextResponse.json({
        success: true,
        user: { id: newUserId, email, fullName, role },
      });
    }

    // 2. If no service role key, call the RPC function admin_create_personnel
    if (anonKey) {
      const sbClient = createClient(supabaseUrl, anonKey);
      const { data: rpcData, error: rpcErr } = await sbClient.rpc(
        "admin_create_personnel",
        {
          p_email: email.trim().toLowerCase(),
          p_password: password.trim(),
          p_full_name: fullName.trim(),
          p_position: position.trim() || "ครูผู้สอน",
          p_department: department.trim() || "กลุ่มงานวิชาการ",
          p_role: role,
          p_school_id: safeSchoolId,
        }
      );

      if (rpcErr) {
        if (
          rpcErr.message.includes("admin_create_personnel") ||
          rpcErr.message.includes("schema cache")
        ) {
          return NextResponse.json(
            {
              error:
                "ยังไม่ได้ติดตั้งฟังก์ชันสร้างผู้ใช้ใน Supabase หรือยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY ใน Vercel\n\nวิธีแก้ไขที่แนะนำ:\n1. ไปที่ Supabase Project Settings -> API แล้วคัดลอก service_role secret key\n2. ไปที่ Vercel Settings -> Environment Variables แล้วเพิ่ม SUPABASE_SERVICE_ROLE_KEY\n3. หรือนำคำสั่ง SQL จากไฟล์ 202610200001_admin_create_personnel.sql ไปรันใน Supabase SQL Editor",
            },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: rpcErr.message },
          { status: 400 }
        );
      }

      if (rpcData && rpcData.success === false) {
        return NextResponse.json(
          { error: rpcData.error || "เกิดข้อผิดพลาดในการสร้างบัญชี" },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        user: rpcData,
      });
    }

    return NextResponse.json(
      { error: "ไม่พบคีย์การเชื่อมต่อ Supabase" },
      { status: 500 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดไม่ทราบสาเหตุ";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
