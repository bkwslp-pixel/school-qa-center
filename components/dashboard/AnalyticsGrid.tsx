"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface AnalyticsGridProps {
  totalIndicators: number;
  evaluationsSummary?: {
    excellent?: number;
    good?: number;
    medium?: number;
    fair?: number;
    needsWork?: number;
  };
}

const defaultPieDataInternal = [
  { name: "ระดับยอดเยี่ยม", value: 6, color: "#10b981" },
  { name: "ระดับดีเลิศ", value: 5, color: "#2563eb" },
  { name: "ระดับดี", value: 3, color: "#d97706" },
  { name: "ระดับปานกลาง", value: 1, color: "#ea580c" },
  { name: "ระดับกำลังพัฒนา", value: 0, color: "#dc2626" },
];

const defaultPieDataExternal = [
  { name: "ระดับยอดเยี่ยม", value: 5, color: "#10b981" },
  { name: "ระดับดีเลิศ", value: 6, color: "#2563eb" },
  { name: "ระดับดี", value: 3, color: "#d97706" },
  { name: "ระดับปานกลาง", value: 1, color: "#ea580c" },
  { name: "ระดับกำลังพัฒนา", value: 0, color: "#dc2626" },
];

const trendData = [
  { year: "2565", internal: 4.1, external: 3.8 },
  { year: "2566", internal: 4.3, external: 4.0 },
  { year: "2567", internal: 4.5, external: 4.3 },
];

export function AnalyticsGrid({ totalIndicators, evaluationsSummary }: AnalyticsGridProps) {
  const [scopeTab, setScopeTab] = useState<"internal" | "external">("internal");

  // Dynamic Pie Data if provided from live evaluations
  const activePieData =
    evaluationsSummary && scopeTab === "internal"
      ? [
          { name: "ระดับยอดเยี่ยม", value: evaluationsSummary.excellent ?? 6, color: "#10b981" },
          { name: "ระดับดีเลิศ", value: evaluationsSummary.good ?? 5, color: "#2563eb" },
          { name: "ระดับดี", value: evaluationsSummary.medium ?? 3, color: "#d97706" },
          { name: "ระดับปานกลาง", value: evaluationsSummary.fair ?? 1, color: "#ea580c" },
          { name: "ระดับกำลังพัฒนา", value: evaluationsSummary.needsWork ?? 0, color: "#dc2626" },
        ]
      : scopeTab === "internal"
      ? defaultPieDataInternal
      : defaultPieDataExternal;

  const currentTotal = activePieData.reduce((acc, curr) => acc + curr.value, 0) || totalIndicators;

  return (
    <section className="analytics-grid">
      {/* Panel 1: Donut Chart */}
      <div className="panel">
        <div className="panel-title">
          <div>
            <h2>ผลการประเมินตามมาตรฐาน</h2>
            <span>ภาพรวมการจำแนกตามระดับคุณภาพ (IQA & EQA)</span>
          </div>
        </div>

        <div className="tabs">
          <button
            className={scopeTab === "internal" ? "selected" : ""}
            onClick={() => setScopeTab("internal")}
          >
            ประเมินภายใน (IQA)
          </button>
          <button
            className={scopeTab === "external" ? "selected" : ""}
            onClick={() => setScopeTab("external")}
          >
            ประเมินภายนอก (สมศ.)
          </button>
        </div>

        <div className="donut-wrap">
          <div className="donut">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={activePieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={82}
                  paddingAngle={3}
                >
                  {activePieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: unknown) => [
                    `${val} ตัวชี้วัด (${((Number(val) / currentTotal) * 100).toFixed(1)}%)`,
                    "จำนวน",
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">
              <strong>{currentTotal}</strong>
              <span>ตัวชี้วัด</span>
            </div>
          </div>

          <div className="legend-list">
            {activePieData.map((item) => (
              <div key={item.name}>
                <span className="legend-dot" style={{ background: item.color }} />
                <span>{item.name}</span>
                <b>
                  {item.value} ({((item.value / currentTotal) * 100).toFixed(1)}%)
                </b>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel 2: Bar Chart Trends */}
      <div className="panel">
        <div className="panel-title">
          <div>
            <h2>แนวโน้มผลการประเมิน</h2>
            <span>คะแนนเฉลี่ยย้อนหลัง 3 ปีการศึกษา (คะแนนเต็ม 5.00)</span>
          </div>
        </div>

        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={trendData}
              margin={{ top: 12, right: 10, left: -16, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaf0f8" />
              <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: "#6a82a4", fontSize: 11 }} />
              <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{ fill: "#6a82a4", fontSize: 11 }} />
              <Tooltip
                formatter={(val: unknown) => [`${Number(val).toFixed(2)} คะแนน`, "ผลประเมิน"]}
                contentStyle={{ borderRadius: 8, borderColor: "#d5e2f3", fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
              <Bar dataKey="internal" name="ภายใน (IQA)" fill="#2474f3" radius={[4, 4, 0, 0]} barSize={28} />
              <Bar dataKey="external" name="ภายนอก (สมศ.)" fill="#1fc59b" radius={[4, 4, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Panel 3: Level Progress */}
      <div className="panel level-summary">
        <div className="panel-title">
          <div>
            <h2>สรุปตามระดับการศึกษา</h2>
            <span>ความพร้อมข้อมูลหลักฐานและการประเมิน โรงเรียนเทศบาล ๑ บ้านกลาง</span>
          </div>
        </div>

        {[
          { name: "ระดับปฐมวัย (อนุบาล 1-3)", value: 88, color: "#e94ca5" },
          { name: "ระดับประถมศึกษา (ป.1 - ป.6)", value: 84, color: "#2578f5" },
          { name: "ระดับมัธยมศึกษา (ม.1 - ม.3)", value: 78, color: "#16ad72" },
        ].map((item) => (
          <div className="level-progress" key={item.name}>
            <div>
              <span>{item.name}</span>
              <b>{item.value}%</b>
            </div>
            <div className="progress-track">
              <i style={{ width: `${item.value}%`, background: item.color }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
