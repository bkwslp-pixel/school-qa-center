"use client";

import { useEffect, useState, useCallback } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import type { School, Task, Indicator, LoadState } from "@/types/database";

import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { StatGrid } from "@/components/dashboard/StatGrid";
import { AnalyticsGrid } from "@/components/dashboard/AnalyticsGrid";
import { IndicatorsTable } from "@/components/dashboard/IndicatorsTable";
import { TasksWidget } from "@/components/dashboard/TasksWidget";

import { StandardsModule } from "@/components/modules/StandardsModule";
import { EvidenceModule } from "@/components/modules/EvidenceModule";
import { EvaluationsModule } from "@/components/modules/EvaluationsModule";
import { TasksModule } from "@/components/modules/TasksModule";
import { ReportsModule } from "@/components/modules/ReportsModule";
import { UsersModule } from "@/components/modules/UsersModule";
import { SettingsModule } from "@/components/modules/SettingsModule";

import { LoginModal } from "@/components/auth/LoginModal";
import { InvitePasswordModal } from "@/components/auth/InvitePasswordModal";

const standardEducationIndicators: Indicator[] = [
  {
    id: "i1",
    code: "1.1",
    title_th: "ผู้เรียนมีพัฒนาการด้านร่างกาย สมวัย มีสุขนิสัยที่ดี",
    standard_id: "s1",
    quality_level: "ยังไม่ประเมิน",
    evidence_count: 0,
    responsible_person: "กลุ่มสาระฯ สุขศึกษาและพลศึกษา",
    status: "not_started",
    weight: 1.0,
  },
  {
    id: "i2",
    code: "1.2",
    title_th: "ผู้เรียนมีคุณธรรม จริยธรรม และค่านิยมที่พึงประสงค์",
    standard_id: "s1",
    quality_level: "ยังไม่ประเมิน",
    evidence_count: 0,
    responsible_person: "งานส่งเสริมคุณธรรม จริยธรรม",
    status: "not_started",
    weight: 1.0,
  },
  {
    id: "i3",
    code: "1.3",
    title_th: "ผู้เรียนมีความสามารถในการอ่าน คิดวิเคราะห์ และเขียน",
    standard_id: "s1",
    quality_level: "ยังไม่ประเมิน",
    evidence_count: 0,
    responsible_person: "กลุ่มสาระฯ ภาษาไทย",
    status: "not_started",
    weight: 1.5,
  },
  {
    id: "i4",
    code: "1.4",
    title_th: "ผู้เรียนมีทักษะการใช้เทคโนโลยีดิจิทัลและการสื่อสาร",
    standard_id: "s1",
    quality_level: "ยังไม่ประเมิน",
    evidence_count: 0,
    responsible_person: "กลุ่มสาระฯ วิทยาศาสตร์และเทคโนโลยี",
    status: "not_started",
    weight: 1.0,
  },
  {
    id: "i5",
    code: "1.5",
    title_th: "ผู้เรียนมีสุขภาวะทางจิตและสังคม มีผลสัมฤทธิ์ตามเกณฑ์",
    standard_id: "s1",
    quality_level: "ยังไม่ประเมิน",
    evidence_count: 0,
    responsible_person: "งานแนะแนวการศึกษา",
    status: "not_started",
    weight: 1.0,
  },
  {
    id: "i6",
    code: "2.1",
    title_th: "สถานศึกษามีเป้าหมาย วิสัยทัศน์ และพันธกิจที่ชัดเจน",
    standard_id: "s2",
    quality_level: "ยังไม่ประเมิน",
    evidence_count: 0,
    responsible_person: "ฝ่ายบริหารแผนงานและนโยบาย",
    status: "not_started",
    weight: 1.0,
  },
  {
    id: "i7",
    code: "3.1",
    title_th: "จัดการเรียนรู้ผ่านกระบวนการคิดและปฏิบัติจริง (Active Learning)",
    standard_id: "s3",
    quality_level: "ยังไม่ประเมิน",
    evidence_count: 0,
    responsible_person: "ฝ่ายพัฒนาวิชาการและครูผู้สอนทุกคน",
    status: "not_started",
    weight: 1.5,
  },
];

const educationLevels = ["ทุกระดับ", "ปฐมวัย", "ประถมศึกษา", "มัธยมศึกษา"];

export default function DashboardPage() {
  const [activeMenu, setActiveMenu] = useState("หน้าหลัก");
  const [mobileNav, setMobileNav] = useState(false);
  const [query, setQuery] = useState("");
  const [schoolYear, setSchoolYear] = useState("2567");
  const [assessmentScope, setAssessmentScope] = useState("ทั้งภายในและภายนอก");
  const [selectedLevel, setSelectedLevel] = useState("ทุกระดับ");

  const [user, setUser] = useState<User | null>(null);
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  // Auth form states
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");

  // Invite & recovery form states
  const [showInvitePassword, setShowInvitePassword] = useState(false);
  const [invitePassword, setInvitePassword] = useState("");
  const [invitePasswordConfirm, setInvitePasswordConfirm] = useState("");
  const [invitePasswordMessage, setInvitePasswordMessage] = useState("");

  // Live Data states (Clean Production State)
  const [school, setSchool] = useState<School | null>({
    id: "sch-1",
    name: "โรงเรียนเทศบาล ๑ บ้านกลาง",
    district: "อำเภอเมืองลำพูน",
    province: "จังหวัดลำพูน",
    affiliation: "สังกัดเทศบาลตำบลบ้านกลาง กรมส่งเสริมการปกครองท้องถิ่น",
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>(standardEducationIndicators);
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [taskCount, setTaskCount] = useState(0);
  const [indicatorCount, setIndicatorCount] = useState(standardEducationIndicators.length);

  const loadData = useCallback(async (sb: SupabaseClient) => {
    try {
      const [
        schoolsRes,
        evidenceRes,
        tasksRes,
        tasksCountRes,
        indicatorsRes,
        indicatorsCountRes,
      ] = await Promise.all([
        sb.from("schools").select("id,name,province,district,affiliation").limit(1).maybeSingle(),
        sb.from("evidence_records").select("id", { count: "exact", head: true }),
        sb.from("tasks").select("id,title,status,due_at,priority,description").order("due_at", { ascending: true }).limit(8),
        sb.from("tasks").select("id", { count: "exact", head: true }),
        sb.from("indicators").select("id,code,title_th,standard_id,weight,target_score").order("sort_order").limit(15),
        sb.from("indicators").select("id", { count: "exact", head: true }),
      ]);

      const firstError =
        schoolsRes.error ||
        evidenceRes.error ||
        tasksRes.error ||
        tasksCountRes.error ||
        indicatorsRes.error ||
        indicatorsCountRes.error;

      if (firstError) {
        console.warn("Supabase live read message (using clean initial state):", firstError.message);
        setLoadState("live");
        return;
      }

      if (schoolsRes.data) {
        setSchool(schoolsRes.data as School);
      }
      if (typeof evidenceRes.count === "number") {
        setEvidenceCount(evidenceRes.count);
      }
      if (tasksRes.data) {
        setTasks(tasksRes.data as Task[]);
      }
      if (typeof tasksCountRes.count === "number") {
        setTaskCount(tasksCountRes.count);
      }
      if (indicatorsRes.data && indicatorsRes.data.length > 0) {
        setIndicators(indicatorsRes.data as Indicator[]);
      }
      if (typeof indicatorsCountRes.count === "number" && indicatorsCountRes.count > 0) {
        setIndicatorCount(indicatorsCountRes.count);
      }

      setLoadState("live");
    } catch (err) {
      console.error("Load data error:", err);
      setLoadState("live");
    }
  }, []);

  useEffect(() => {
    // Check invite or reset tokens in URL hash
    if (typeof window !== "undefined") {
      const authParams = new URLSearchParams(window.location.hash.slice(1));
      const linkError = authParams.get("error_description");
      if (linkError) {
        const expired = /expired|invalid/i.test(linkError);
        setShowLogin(true);
        setAuthMessage(
          expired
            ? "ลิงก์ยืนยันหมดอายุหรือถูกใช้แล้ว กรุณาเข้าสู่ระบบหรือขอลิงก์ตั้งรหัสผ่านใหม่"
            : `ยืนยันบัญชีไม่สำเร็จ: ${linkError}`
        );
      }
      if (["invite", "recovery"].includes(authParams.get("type") ?? "")) {
        setShowInvitePassword(true);
      }
    }

    const sb = getSupabase();
    setClient(sb);

    if (!sb) {
      setLoadState("mock");
      return;
    }

    sb.auth.getUser().then(({ data }) => {
      setUser(data.user);
      void loadData(sb);
    });

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        window.setTimeout(() => void loadData(sb), 0);
      } else {
        setLoadState("live");
      }
    });

    return () => subscription.unsubscribe();
  }, [loadData]);

  // Auth Handlers
  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!client) return;
    setAuthBusy(true);
    setAuthMessage("");
    const { error } = await client.auth.signInWithPassword({ email, password });
    setAuthBusy(false);
    if (error) {
      setAuthMessage("เข้าสู่ระบบไม่สำเร็จ: " + error.message);
    } else {
      setShowLogin(false);
      setPassword("");
      setAuthMessage("");
    }
  }

  async function handleSendPasswordRecovery() {
    if (!client) return;
    if (!email) {
      setAuthMessage("กรุณากรอกอีเมลก่อนขอลิงก์ตั้งรหัสผ่านใหม่");
      return;
    }
    setAuthBusy(true);
    setAuthMessage("");
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
    });
    setAuthBusy(false);
    setAuthMessage(
      error
        ? "ส่งลิงก์ไม่สำเร็จ: " + error.message
        : "ส่งลิงก์ตั้งรหัสผ่านใหม่ไปยังอีเมลของท่านเรียบร้อยแล้ว"
    );
  }

  async function handleSignOut() {
    if (!client) return;
    await client.auth.signOut();
    setUser(null);
  }

  async function handleSetInvitedUserPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!client) return;
    if (invitePassword !== invitePasswordConfirm) {
      setInvitePasswordMessage("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }
    setAuthBusy(true);
    setInvitePasswordMessage("");
    const { error } = await client.auth.updateUser({ password: invitePassword });
    setAuthBusy(false);
    if (error) {
      setInvitePasswordMessage("ตั้งรหัสผ่านไม่สำเร็จ: " + error.message);
    } else {
      setInvitePassword("");
      setInvitePasswordConfirm("");
      setInvitePasswordMessage(
        "ตั้งรหัสผ่านเรียบร้อยแล้ว คุณสามารถเข้าใช้งานระบบประกันคุณภาพได้ทันที"
      );
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
  }

  return (
    <main className="app-shell">
      {/* Sidebar Navigation */}
      <Sidebar
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        mobileNav={mobileNav}
        setMobileNav={setMobileNav}
        school={school}
        schoolYear={schoolYear}
        setSchoolYear={setSchoolYear}
      />

      {/* Main Area */}
      <section className="main-area">
        {/* Topbar */}
        <Topbar
          mobileNav={mobileNav}
          setMobileNav={setMobileNav}
          query={query}
          setQuery={setQuery}
          user={user}
          loadState={loadState}
          onSignOut={handleSignOut}
          onOpenLogin={() => setShowLogin(true)}
          notificationCount={tasks.filter((t) => t.status !== "completed").length}
        />

        <div className="content">
          {/* Menu Router */}
          {activeMenu === "หน้าหลัก" && (
            <>
              <WelcomeBanner
                levels={educationLevels}
                selectedLevel={selectedLevel}
                setSelectedLevel={setSelectedLevel}
                schoolYear={schoolYear}
                setSchoolYear={setSchoolYear}
                assessmentScope={assessmentScope}
                setAssessmentScope={setAssessmentScope}
                onRefresh={() => client && void loadData(client)}
              />

              <StatGrid
                indicatorCount={indicatorCount}
                evidenceCount={evidenceCount}
                taskCount={taskCount}
              />

              <AnalyticsGrid totalIndicators={indicatorCount} />

              <IndicatorsTable
                indicators={indicators}
                loadState={loadState}
                hasUser={Boolean(user)}
                onViewAll={() => setActiveMenu("มาตรฐานและตัวชี้วัด")}
                query={query}
              />

              <TasksWidget
                tasks={tasks}
                onViewAllTasks={() => setActiveMenu("งานติดตาม")}
              />
            </>
          )}

          {activeMenu === "มาตรฐานและตัวชี้วัด" && (
            <StandardsModule
              indicators={indicators}
              onBack={() => setActiveMenu("หน้าหลัก")}
            />
          )}

          {activeMenu === "คลังหลักฐาน" && (
            <EvidenceModule
              school={school}
              user={user}
              client={client}
              indicators={indicators}
              academicYear={schoolYear}
              onEvidenceCountChange={(count) => setEvidenceCount(count)}
            />
          )}

          {activeMenu === "ผลการประเมิน" && (
            <EvaluationsModule
              school={school}
              user={user}
              client={client}
              indicators={indicators}
              academicYear={schoolYear}
              onNavigateToEvidence={() => setActiveMenu("คลังหลักฐาน")}
            />
          )}

          {activeMenu === "งานติดตาม" && (
            <TasksModule
              initialTasks={tasks}
              school={school}
              user={user}
              client={client}
              indicators={indicators}
              onTasksChange={() => client && void loadData(client)}
            />
          )}

          {activeMenu === "รายงาน" && (
            <ReportsModule
              school={school}
              academicYear={schoolYear}
            />
          )}

          {activeMenu === "จัดการผู้ใช้" && (
            <UsersModule
              client={client}
              school={school}
            />
          )}

          {activeMenu === "ตั้งค่าระบบ" && (
            <SettingsModule
              school={school}
              client={client}
              user={user}
              currentYearProp={schoolYear}
              onYearChange={(y) => setSchoolYear(y)}
              onUpdateSchool={(updated) =>
                setSchool((prev) => (prev ? { ...prev, ...updated } : (updated as School)))
              }
            />
          )}

          {/* Footer */}
          <footer className="footer">
            <span>
              School QA Bkms1 v2.0 | พัฒนาสำหรับโรงเรียนเทศบาล ๑ บ้านกลาง จังหวัดลำพูน
            </span>
            <span>ระบบบริหารจัดการข้อมูลการประกันคุณภาพการศึกษา (IQA & EQA)</span>
          </footer>
        </div>
      </section>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        onSignIn={handleSignIn}
        onSendPasswordRecovery={handleSendPasswordRecovery}
        authBusy={authBusy}
        authMessage={authMessage}
        client={client}
      />

      {/* Invite / Recovery Password Modal */}
      <InvitePasswordModal
        isOpen={showInvitePassword && Boolean(user)}
        onClose={() => setShowInvitePassword(false)}
        password={invitePassword}
        setPassword={setInvitePassword}
        confirmPassword={invitePasswordConfirm}
        setConfirmPassword={setInvitePasswordConfirm}
        onSubmit={handleSetInvitedUserPassword}
        authBusy={authBusy}
        message={invitePasswordMessage}
        client={client}
      />
    </main>
  );
}
