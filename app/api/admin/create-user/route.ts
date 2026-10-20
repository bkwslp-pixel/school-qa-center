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

      // Upsert profile
      await supabaseAdmin.from("profiles").upsert({
        id: newUserId,
        full_name: fullName.trim(),
        position: position.trim() || "ครูผู้สอน",
        department: department.trim() || "กลุ่มงานวิชาการ",
        school_id: schoolId || null,
      });

      // Upsert user_role
      if (schoolId) {
        await supabaseAdmin.from("user_roles").upsert(
          {
            user_id: newUserId,
            school_id: schoolId,
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
          p_school_id: schoolId || null,
        }
      );

      if (rpcErr) {
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
