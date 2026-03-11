import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import {
    Trophy, Star, Flame, Target, Zap, Award,
    FolderKanban, ExternalLink, Briefcase, Mail,
    Sparkles, Medal, TrendingUp
} from "lucide-react";

/* ─── Projects ─── */
const PROJECTS = [];

/* ─── Industry contacts ─── */
const INDUSTRY_CONTACTS = [];

const statusColor = (s) =>
    s === "Completed" ? "bg-green-100 text-green-700"
        : s === "In Progress" ? "bg-amber-100 text-amber-700"
            : "bg-slate-100 text-slate-600";

const progressGradient = (p) =>
    p === 100
        ? "bg-gradient-to-r from-green-400 to-emerald-500"
        : p > 50
            ? "bg-gradient-to-r from-blue-400 to-violet-500"
            : "bg-gradient-to-r from-amber-400 to-orange-500";

export default function Achievements() {
    const { user } = useAuth();

    const contactedCount = INDUSTRY_CONTACTS.filter(c => c.contacted).length;

    return (
        <DashboardLayout title="Achievements">
            <div className="max-w-[1200px] mx-auto pb-8 space-y-6 md:space-y-8">

                {/* ═══ Projects ═══ */}
                <div className="bg-white rounded-2xl p-5 md:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-[45px] h-[45px] rounded-xl flex items-center justify-center bg-violet-100 text-violet-600 shrink-0">
                            <FolderKanban className="w-[22px] h-[22px]" />
                        </div>
                        <div>
                            <span className="font-semibold text-slate-800 text-base block">My Projects</span>
                            <span className="text-xs text-slate-500">{PROJECTS.filter(p => p.status === "Completed").length} completed, {PROJECTS.filter(p => p.status !== "Completed").length} in progress</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {PROJECTS.length > 0 ? (
                            PROJECTS.map((project, idx) => (
                                <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all duration-200">
                                    <div className="flex items-center justify-between mb-2.5">
                                        <h4 className="font-semibold text-slate-800 text-[0.95rem] flex items-center gap-1.5">
                                            <ExternalLink className="w-4 h-4 text-violet-400" />
                                            {project.name}
                                        </h4>
                                        <span className={`text-[0.72rem] px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap ${statusColor(project.status)}`}>
                                            {project.status}
                                        </span>
                                    </div>
                                    <p className="text-[0.82rem] text-slate-500 mb-3">Tech: {project.tech}</p>
                                    {/* Progress bar */}
                                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ease-out ${progressGradient(project.progress)}`}
                                            style={{ width: `${project.progress}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between mt-1.5">
                                        <span className="text-[0.72rem] text-slate-400">Progress</span>
                                        <span className="text-[0.72rem] font-medium text-slate-600">{project.progress}%</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full p-8 text-center bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                                <p className="text-slate-500 font-medium">No projects yet. Start building to see your projects here!</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══ Industry Contacts ═══ */}
                <div className="bg-white rounded-2xl p-5 md:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-[45px] h-[45px] rounded-xl flex items-center justify-center bg-indigo-100 text-indigo-600 shrink-0">
                            <Briefcase className="w-[22px] h-[22px]" />
                        </div>
                        <div>
                            <span className="font-semibold text-slate-800 text-base block">Industry Persons Contacted</span>
                            <span className="text-xs text-slate-500">{contactedCount} of {INDUSTRY_CONTACTS.length} contacted</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {INDUSTRY_CONTACTS.length > 0 ? (
                            INDUSTRY_CONTACTS.map((contact, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all duration-200">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-[40px] h-[40px] rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${contact.contacted
                                            ? "bg-indigo-100 text-indigo-600"
                                            : "bg-slate-100 text-slate-500"
                                            }`}>
                                            {contact.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-800 text-[0.95rem]">{contact.name}</div>
                                            <div className="text-[0.8rem] text-slate-500">{contact.role} • {contact.company}</div>
                                        </div>
                                    </div>
                                    {contact.contacted ? (
                                        <span className="flex items-center gap-1 text-[0.75rem] px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-medium whitespace-nowrap">
                                            <Mail className="w-3 h-3" />
                                            Contacted
                                        </span>
                                    ) : (
                                        <span className="text-[0.75rem] px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-medium whitespace-nowrap">
                                            Pending
                                        </span>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full p-8 text-center bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                                <p className="text-slate-500 font-medium">No industry contacts yet. Connect with professionals to build your network!</p>
                            </div>
                        )}
                    </div>

                    {INDUSTRY_CONTACTS.length > 0 && (
                        <div className="mt-5 flex items-center gap-2 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                            <TrendingUp className="w-4 h-4 text-indigo-600 shrink-0" />
                            <p className="text-[0.82rem] text-indigo-700">
                                <span className="font-semibold">{contactedCount}</span> industry professionals contacted out of{" "}
                                <span className="font-semibold">{INDUSTRY_CONTACTS.length}</span>
                            </p>
                        </div>
                    )}
                </div>

            </div>
        </DashboardLayout>
    );
}
