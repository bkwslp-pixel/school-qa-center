"use client";

import { useEffect, useState, useCallback } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { Shield } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import type { School, Task, Indicator, LoadState, UserRoleType } from "@/types/database";
import { useNotification } from "@/components/ui/NotificationProvider";

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
import { ChangePasswordModal } from "@/components/auth/ChangePasswordModal";

import { BASIC_EDUCATION_INDICATORS } from "@/lib/qa-framework";

const standardEducationIndicators: Indicator[] = BASIC_EDUCATION_INDICATORS.map((ind) => ({
  id: `ind-${ind.code}`,
  code: ind.code,
  title_th: ind.title,
  standard_id:
    ind.standardCode === "มาตรฐานที่ ๑" ? "s1" : ind.standardCode === "มาตรฐานที่ ๒" ? "s2" : "s3",
  quality_level: "รอการประเมิน",
  evidence_count: 0,
  responsible_person: "คณะกรรมการประกันคุณภาพและกลุ่มสาระการเรียนรู้",
  status: "not_started",
  weight: ind.weight,
}));

const educationLevels = ["ทุกระดับ", "ปฐมวัย", "ประถมศึกษา", "มัธยมศึกษา"];

export default function DashboardPage() {
  const { showToast } = useNotification();
  const [activeMenu, setActiveMenu] = useState("หน้าหลัก");
  const [mobileNav, setMobileNav] = useState(false);
  const [query, setQuery] = useState("");
  const [schoolYear, setSchoolYear] = useState("2567");
  const [availableYears, setAvailableYears] = useState<string[]>(["2569", "2568", "2567", "2566"]);
  const [assessmentScope, setAssessmentScope] = useState("ทั้งภายในและภายนอก");
  const [selectedLevel, setSelectedLevel] = useState("ทุกระดับ");

  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRoleType | null>(null);
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  const isAdminOrLeadership = Boolean(
    userRole === "admin" ||
    userRole === "school_leadership" ||
    user?.email === "bkwslp@gmail.com"
  );

  // Auth form states
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");

  // Invite & recovery form states
  const [showInvitePassword, setShowInvitePassword] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [invitePassword, setInvitePassword] = useState("");
  const [invitePasswordConfirm, setInvitePasswordConfirm] = useState("");
  const [invitePasswordMessage, setInvitePasswordMessage] = useState("");

  // Live Data states (Clean Production State)
  const [school, setSchool] = useState<School | null>({
    id: "",
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
  const [evaluationsSummary, setEvaluationsSummary] = useState<{
    excellent?: number;
    good?: number;
    medium?: number;
    fair?: number;
    needsWork?: number;
  } | undefined>(undefined);

  // Synchronize menu with URL query parameters and browser navigation history
  const handleSelectMenu = useCallback((menu: string) => {
    setActiveMenu(menu);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (menu === "หน้าหลัก") {
        url.searchParams.delete("menu");
      } else {
        url.searchParams.set("menu", menu);
      }
      window.history.pushState({ menu }, "", url.toString());
    }
  }, []);

  const handleSelectYear = useCallback((yr: string) => {
    setSchoolYear(yr);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("year", yr);
      window.history.replaceState(null, "", url.toString());
    }
  }, []);

  const loadData = useCallback(async (sb: SupabaseClient) => {
    try {
      const [
        schoolsRes,
        evidenceRes,
        tasksRes,
        tasksCountRes,
        indicatorsRes,
        indicatorsCountRes,
        yearsRes,
        evaluationsRes,
      ] = await Promise.all([
        sb.from("schools").select("id,name,province,district,affiliation").limit(1).maybeSingle(),
        sb.from("evidence_records").select("id", { count: "exact", head: true }),
        sb.from("tasks").select("id,title,status,due_at,priority,description").order("due_at", { ascending: true }).limit(8),
        sb.from("tasks").select("id", { count: "exact", head: true }),
        sb.from("indicators").select("id,code,title_th,standard_id,weight,target_score").order("sort_order").limit(15),
        sb.from("indicators").select("id", { count: "exact", head: true }),
        sb.from("academic_years").select("year, is_active").order("year", { ascending: false }),
        sb.from("evaluations").select("self_score, status"),
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

      // Live calculation of evaluations summary for dashboard analytics
      if (evaluationsRes?.data && evaluationsRes.data.length > 0) {
        const summary = { excellent: 0, good: 0, medium: 0, fair: 0, needsWork: 0 };
        evaluationsRes.data.forEach((row: { self_score?: number | string | null }) => {
          const s = row.self_score ? Math.round(Number(row.self_score)) : 0;
          if (s >= 5) summary.excellent += 1;
          else if (s === 4) summary.good += 1;
          else if (s === 3) summary.medium += 1;
          else if (s === 2) summary.fair += 1;
          else if (s === 1) summary.needsWork += 1;
        });
        setEvaluationsSummary(summary);
      }

      // Dynamic academic years from academic_years table
      const allFoundYears = new Set<string>(["2569", "2568", "2567", "2566"]);
      if (yearsRes?.data && yearsRes.data.length > 0) {
        yearsRes.data.forEach((r: { year: string; is_active?: boolean }) => {
          if (r.year) allFoundYears.add(r.year);
          if (r.is_active && typeof window !== "undefined" && !window.location.search.includes("year=")) {
            setSchoolYear((prev) => (prev === "2567" ? r.year : prev));
          }
        });
      }
      const sortedYears = Array.from(allFoundYears).sort((a, b) => b.localeCompare(a));
      setAvailableYears(sortedYears);

      setLoadState("live");
    } catch (err) {
      console.error("Load data error:", err);
      setLoadState("live");
    }
  }, []);

  const handleAddAcademicYear = useCallback(
    async (newYear: string) => {
      const clean = newYear.trim();
      if (!clean) return;

      setAvailableYears((prev) => {
        const next = Array.from(new Set([clean, ...prev])).sort((a, b) => b.localeCompare(a));
        return next;
      });
      handleSelectYear(clean);

      if (client) {
        try {
          const isValidSchoolUuid =
            Boolean(school?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(school.id));
          if (isValidSchoolUuid && school?.id) {
            await client.from("academic_years").upsert(
              {
                school_id: school.id,
                year: clean,
                is_active: true,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "school_id,year" }
            );
          }
        } catch (err) {
          console.warn("Save academic year error:", err);
        }
      }
      showToast(`เพิ่มปีการศึกษา ${clean} เข้าสู่ระบบเรียบร้อยแล้ว`, "success", "บันทึกข้อมูลสำเร็จ");
    },
    [client, school?.id, showToast, handleSelectYear]
  );

  useEffect(() => {
    // 1. Check URL parameters on mount and listen to popstate (browser back/forward)
    if (typeof window !== "undefined") {
      const applyUrlParams = () => {
        const params = new URLSearchParams(window.location.search);
        const menuParam = params.get("menu");
        const yearParam = params.get("year");
        const VALID_MENUS = [
          "หน้าหลัก",
          "มาตรฐานและตัวชี้วัด",
          "คลังหลักฐาน",
          "ผลการประเมิน",
          "งานติดตาม",
          "รายงาน",
          "จัดการผู้ใช้",
          "ตั้งค่าระบบ",
        ];
        if (menuParam && VALID_MENUS.includes(menuParam)) {
          setActiveMenu(menuParam);
        }
        if (yearParam && /^\d{4}$/.test(yearParam)) {
          setSchoolYear(yearParam);
        }
      };

      applyUrlParams();
      window.addEventListener("popstate", applyUrlParams);

      // Check invite or reset tokens in URL hash
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

    const fetchUserRole = async (currentUser: User, sbClient: SupabaseClient) => {
      try {
        const { data: roleRow } = await sbClient
          .from("user_roles")
          .select("role")
          .eq("user_id", currentUser.id)
          .maybeSingle();

        if (roleRow?.role) {
          setUserRole(roleRow.role as UserRoleType);
        } else if (currentUser.email === "bkwslp@gmail.com") {
          setUserRole("admin");
        } else {
          setUserRole("teacher");
        }
      } catch (err) {
        console.warn("fetchUserRole err:", err);
        if (currentUser.email === "bkwslp@gmail.com") {
          setUserRole("admin");
        } else {
          setUserRole("teacher");
        }
      }
    };

    sb.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        void fetchUserRole(data.user, sb);
      } else {
        setUserRole(null);
      }
      void loadData(sb);
    });

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        void fetchUserRole(session.user, sb);
        window.setTimeout(() => void loadData(sb), 0);
      } else {
        setUserRole(null);
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
      let friendlyMsg = error.message;
      if (error.message.includes("Invalid login credentials")) {
        friendlyMsg = "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง";
      } else if (error.message.includes("Email not confirmed")) {
        friendlyMsg = "อีเมลนี้ยังไม่ได้รับการยืนยัน กรุณาติดต่อผู้ดูแลระบบ";
      } else if (error.message.includes("Too many requests")) {
        friendlyMsg = "คุณพยายามเข้าสู่ระบบถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง";
      }
      setAuthMessage("เข้าสู่ระบบไม่สำเร็จ: " + friendlyMsg);
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
    setUserRole(null);
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
        setActiveMenu={handleSelectMenu}
        mobileNav={mobileNav}
        setMobileNav={setMobileNav}
        school={school}
        schoolYear={schoolYear}
        setSchoolYear={handleSelectYear}
        availableYears={availableYears}
        isAdminOrLeadership={isAdminOrLeadership}
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
          userRole={userRole}
          loadState={loadState}
          onSignOut={handleSignOut}
          onOpenLogin={() => setShowLogin(true)}
          onOpenChangePassword={() => setShowChangePassword(true)}
          notificationCount={tasks.filter((t) => t.status !== "completed").length}
          onNotificationClick={() => handleSelectMenu("งานติดตาม")}
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
                setSchoolYear={handleSelectYear}
                availableYears={availableYears}
                onAddAcademicYear={handleAddAcademicYear}
                isAdminOrLeadership={isAdminOrLeadership}
                assessmentScope={assessmentScope}
                setAssessmentScope={setAssessmentScope}
                onRefresh={() => client && void loadData(client)}
              />

              <StatGrid
                indicatorCount={indicatorCount}
                evidenceCount={evidenceCount}
                taskCount={taskCount}
              />

              <AnalyticsGrid
                totalIndicators={indicatorCount}
                evaluationsSummary={evaluationsSummary}
              />

              <IndicatorsTable
                indicators={indicators}
                loadState={loadState}
                hasUser={Boolean(user)}
                onViewAll={() => handleSelectMenu("มาตรฐานและตัวชี้วัด")}
                query={query}
              />

              <TasksWidget
                tasks={tasks}
                onViewAllTasks={() => handleSelectMenu("งานติดตาม")}
              />
            </>
          )}

          {activeMenu === "มาตรฐานและตัวชี้วัด" && (
            <StandardsModule
              indicators={indicators}
              onBack={() => handleSelectMenu("หน้าหลัก")}
              onNavigateToEvaluations={() => handleSelectMenu("ผลการประเมิน")}
              onNavigateToEvidence={() => handleSelectMenu("คลังหลักฐาน")}
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
              onNavigateToEvidence={() => handleSelectMenu("คลังหลักฐาน")}
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
            isAdminOrLeadership ? (
              <UsersModule
                client={client}
                school={school}
                currentUser={user}
                currentUserRole={userRole}
              />
            ) : (
              <div className="panel" style={{ padding: "48px 24px", textAlign: "center", maxWidth: 640, margin: "40px auto", borderRadius: 16 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#fef3c7", color: "#d97706", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
                  <Shield size={32} />
                </div>
                <h2 style={{ fontSize: 20, color: "#1e3a5f", margin: "0 0 8px" }}>
                  สงวนสิทธิ์เฉพาะผู้ดูแลระบบและฝ่ายบริหาร
                </h2>
                <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.8, margin: "0 0 24px" }}>
                  เมนูนี้สำหรับการบริหารจัดการสิทธิ์บัญชีผู้ใช้งานตามนโยบายความปลอดภัย (RBAC)<br />
                  สำหรับคุณครูผู้รับผิดชอบตัวชี้วัด ท่านสามารถอัปโหลดเอกสารหลักฐาน บันทึกคะแนนประเมินตนเอง และติดตามภารกิจได้ที่เมนู <strong>&ldquo;คลังหลักฐาน&rdquo;</strong> และ <strong>&ldquo;ผลการประเมิน&rdquo;</strong> ได้ตามปกติ
                </p>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                  <button className="primary-button" onClick={() => handleSelectMenu("หน้าหลัก")}>
                    กลับสู่หน้าหลัก
                  </button>
                  {!user && (
                    <button
                      className="primary-button"
                      style={{ background: "#f1f5f9", color: "#334155" }}
                      onClick={() => setShowLogin(true)}
                    >
                      เข้าสู่ระบบด้วยบัญชีผู้ดูแลระบบ
                    </button>
                  )}
                </div>
              </div>
            )
          )}

          {activeMenu === "ตั้งค่าระบบ" && (
            isAdminOrLeadership ? (
              <SettingsModule
                school={school}
                client={client}
                user={user}
                currentYearProp={schoolYear}
                availableYears={availableYears}
                onAddAcademicYear={handleAddAcademicYear}
                onYearChange={(y) => handleSelectYear(y)}
                onUpdateSchool={(updated) =>
                  setSchool((prev) => (prev ? { ...prev, ...updated } : (updated as School)))
                }
              />
            ) : (
              <div className="panel" style={{ padding: "48px 24px", textAlign: "center", maxWidth: 640, margin: "40px auto", borderRadius: 16 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#fef3c7", color: "#d97706", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
                  <Shield size={32} />
                </div>
                <h2 style={{ fontSize: 20, color: "#1e3a5f", margin: "0 0 8px" }}>
                  สงวนสิทธิ์เฉพาะผู้ดูแลระบบและฝ่ายบริหาร
                </h2>
                <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.8, margin: "0 0 24px" }}>
                  เมนูการตั้งค่าข้อมูลพื้นฐานของโรงเรียนสงวนสิทธิ์เฉพาะฝ่ายบริหารและผู้ดูแลระบบเท่านั้น
                </p>
                <button className="primary-button" onClick={() => handleSelectMenu("หน้าหลัก")}>
                  กลับสู่หน้าหลัก
                </button>
              </div>
            )
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

      {/* Change Password Modal for logged-in user */}
      <ChangePasswordModal
        isOpen={showChangePassword && Boolean(user)}
        onClose={() => setShowChangePassword(false)}
        user={user}
        client={client}
      />
    </main>
  );
}
