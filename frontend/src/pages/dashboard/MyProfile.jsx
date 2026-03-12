import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { toast } from "sonner";
import {
    User, KeyRound, ClipboardList, Pencil, Check, Mail, Phone,
    Building2, MapPin, Calendar, Shield, Camera, Eye, EyeOff, Loader2
} from "lucide-react";

const TABS = [
    { id: "personal", label: "Personal Info", icon: User },
    { id: "password", label: "Password", icon: KeyRound },
    { id: "activity", label: "Activity", icon: ClipboardList },
];

export default function MyProfile() {
    const { user: authUser } = useAuth();
    const [activeTab, setActiveTab] = useState("personal");
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // Personal info form
    const [form, setForm] = useState({ name: "", phone: "", department: "", address: "" });
    const [saving, setSaving] = useState(false);

    // Password form
    const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
    const [pwSaving, setPwSaving] = useState(false);

    // Avatar upload
    const [uploading, setUploading] = useState(false);

    // Fetch profile
    useEffect(() => {
        (async () => {
            try {
                // Ensure we get the full populated user profile including addedBy
                const { data } = await api.get(`/users/${authUser?._id}`);
                setProfile(data);
                setForm({
                    name: data.name || "",
                    phone: data.phone || "",
                    department: data.department || "",
                    address: data.address || "",
                });
            } catch {
                toast.error("Failed to load profile");
            } finally {
                setLoading(false);
            }
        })();
    }, [authUser]);

    const displayName = profile?.name || profile?.email?.split("@")[0] || "User";
    const initials = profile?.name
        ? profile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
        : profile?.email?.charAt(0).toUpperCase() || "U";

    // Password strength
    const strength = useMemo(() => {
        const p = pwForm.newPassword;
        if (!p) return { level: 0, label: "Enter new password", cls: "" };
        let s = 0;
        if (p.length >= 8) s++;
        if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
        if (/\d/.test(p)) s++;
        if (/[!@#$%^&*()_+\-=]/.test(p)) s++;
        if (s <= 1) return { level: 33, label: "Weak password", cls: "bg-red-500" };
        if (s <= 3) return { level: 66, label: "Medium password", cls: "bg-amber-500" };
        return { level: 100, label: "Strong password", cls: "bg-green-500" };
    }, [pwForm.newPassword]);

    const handleProfileSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put("/auth/profile", form);
            setProfile(prev => ({ ...prev, ...form }));
            toast.success("Profile updated successfully");
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update");
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (pwForm.newPassword !== pwForm.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        if (pwForm.newPassword.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }
        setPwSaving(true);
        try {
            await api.put("/auth/password", {
                currentPassword: pwForm.currentPassword,
                newPassword: pwForm.newPassword,
            });
            toast.success("Password changed successfully");
            setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to change password");
        } finally {
            setPwSaving(false);
        }
    };

    // Avatar upload handler
    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be under 5 MB');
            return;
        }
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('avatar', file);
            const { data } = await api.post('/auth/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setProfile(prev => ({ ...prev, profilePicture: data.profilePicture }));

            // Update authUser context so layout header updates too
            const existingUser = JSON.parse(localStorage.getItem("user") || "{}");
            const updatedUser = { ...existingUser, profilePicture: data.profilePicture };
            localStorage.setItem("user", JSON.stringify(updatedUser));

            // Dispatch a custom event to notify useAuth to re-read localStorage
            window.dispatchEvent(new Event("user-updated"));

            toast.success('Profile picture updated!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to upload image');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—";

    if (loading) return <DashboardLayout><div className="text-center py-20 text-muted-foreground">Loading...</div></DashboardLayout>;

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6">

                {/* Header Card */}
                <div className="rounded-xl border border-border/50 bg-card shadow-sm p-5 sm:p-7">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-7">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            {profile?.profilePicture ? (
                                <img
                                    src={profile.profilePicture}
                                    alt={displayName}
                                    className="h-24 w-24 rounded-full border-[3px] border-border object-cover"
                                />
                            ) : (
                                <div className="h-24 w-24 rounded-full border-[3px] border-border bg-muted flex items-center justify-center text-3xl font-semibold text-primary">
                                    {initials}
                                </div>
                            )}
                            <label className="absolute bottom-1 right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer border-2 border-card hover:brightness-110 transition" title="Upload photo">
                                {uploading ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Camera className="h-3.5 w-3.5" />
                                )}
                                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
                            </label>
                        </div>
                        {/* Info */}
                        <div className="text-center sm:text-left">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                <h2 className="text-xl sm:text-2xl font-bold text-primary">{displayName}</h2>
                                {profile?.domain && (
                                    <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                                        Assigned Domain(s): {profile.domain}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-2 text-sm text-muted-foreground min-w-0">
                                <span className="flex items-center gap-1.5 justify-center sm:justify-start min-w-0 truncate" title={profile?.email}>
                                  <Mail className="h-3.5 w-3.5 text-primary/60 shrink-0" /><span className="truncate">{profile?.email}</span>
                                </span>
                                {profile?.phone && <span className="flex items-center gap-1.5 justify-center sm:justify-start shrink-0"><Phone className="h-3.5 w-3.5 text-primary/60" />{profile.phone}</span>}
                            </div>
                            {profile?.address && (
                                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5 justify-center sm:justify-start"><MapPin className="h-3.5 w-3.5 text-primary/60" />{profile.address}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Nav Tabs */}
                <div className="flex gap-2 border-b-2 border-border pb-2 overflow-x-auto">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-md text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    }`}>
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Personal Info Tab */}
                {activeTab === "personal" && (
                    <div className="grid gap-5 lg:grid-cols-2 animate-in fade-in duration-300">
                        {/* Edit Form */}
                        <div className="rounded-xl border border-border/50 bg-card shadow-sm p-5 sm:p-6">
                            <h3 className="text-base font-semibold text-primary flex items-center gap-2 mb-5 pb-3 border-b border-border">
                                <Pencil className="h-4 w-4 text-primary/70" /> Edit Information
                            </h3>
                            <form onSubmit={handleProfileSave} className="space-y-4">
                                <FormInput label="Full Name" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="Your full name" />
                                <FormInput label="Email Address" value={profile?.email || ""} disabled />
                                <FormInput label="Phone Number" value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} placeholder="+1 234 567 890" />
                                <FormInput label="Department" value={form.department} onChange={v => setForm(p => ({ ...p, department: v }))} placeholder="e.g. Computer Science" />
                                <FormInput label="Address" value={form.address} onChange={v => setForm(p => ({ ...p, address: v }))} placeholder="City, State" />
                                <button type="submit" disabled={saving}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition">
                                    <Check className="h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
                                </button>
                            </form>
                        </div>

                        {/* Account Details */}
                        <div className="rounded-xl border border-border/50 bg-card shadow-sm p-5 sm:p-6 h-fit">
                            <h3 className="text-base font-semibold text-primary flex items-center gap-2 mb-5 pb-3 border-b border-border">
                                <Shield className="h-4 w-4 text-primary/70" /> Account Details
                            </h3>
                            <div className="space-y-3">
                                <InfoItem label="Member Since" value={fmtDate(profile?.createdAt)} />
                                <InfoItem label="Last Updated" value={fmtDate(profile?.updatedAt)} />
                                <InfoItem label="Account Type" value={
                                    profile?.role === "super-admin" ? "Super Administrator"
                                        : profile?.role === "admin" ? "Faculty"
                                            : profile?.role === "student" ? "Student"
                                                : profile?.role?.replace("_", " ") || "—"
                                } />
                                {profile?.regNo && <InfoItem label="Registration No." value={profile.regNo} />}
                                {profile?.year && <InfoItem label="Current Year" value={profile.year} />}
                                {profile?.domain && <InfoItem label="Domain" value={profile.domain} />}
                                {profile?.addedBy && (
                                    <InfoItem label="Added By" value={`${profile.addedBy.name || profile.addedBy.email} (Faculty)`} />
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Password Tab */}
                {activeTab === "password" && (
                    <div className="grid gap-5 lg:grid-cols-2 animate-in fade-in duration-300">
                        {/* Change Password Form */}
                        <div className="rounded-xl border border-border/50 bg-card shadow-sm p-5 sm:p-6">
                            <h3 className="text-base font-semibold text-primary flex items-center gap-2 mb-5 pb-3 border-b border-border">
                                <KeyRound className="h-4 w-4 text-primary/70" /> Change Password
                            </h3>
                            <form onSubmit={handlePasswordChange} className="space-y-4">
                                <PasswordInput label="Current Password" value={pwForm.currentPassword}
                                    onChange={v => setPwForm(p => ({ ...p, currentPassword: v }))}
                                    show={showPw.current} onToggle={() => setShowPw(p => ({ ...p, current: !p.current }))} />

                                <div className="space-y-1">
                                    <PasswordInput label="New Password" value={pwForm.newPassword}
                                        onChange={v => setPwForm(p => ({ ...p, newPassword: v }))}
                                        show={showPw.new} onToggle={() => setShowPw(p => ({ ...p, new: !p.new }))} />
                                    {/* Strength bar */}
                                    <div className="h-1 rounded-full bg-border overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-300 ${strength.cls}`} style={{ width: `${strength.level}%` }} />
                                    </div>
                                    <p className="text-xs text-muted-foreground">{strength.label}</p>
                                </div>

                                <div className="space-y-1">
                                    <PasswordInput label="Confirm Password" value={pwForm.confirmPassword}
                                        onChange={v => setPwForm(p => ({ ...p, confirmPassword: v }))}
                                        show={showPw.confirm} onToggle={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))} />
                                    {pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
                                        <p className="text-xs text-destructive">Passwords do not match</p>
                                    )}
                                </div>

                                <button type="submit" disabled={pwSaving}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition">
                                    <Check className="h-4 w-4" /> {pwSaving ? "Updating..." : "Update Password"}
                                </button>
                            </form>
                        </div>

                        {/* Password Requirements */}
                        <div className="rounded-xl border border-border/50 bg-card shadow-sm p-5 sm:p-6 h-fit">
                            <h3 className="text-base font-semibold text-primary flex items-center gap-2 mb-5 pb-3 border-b border-border">
                                <Shield className="h-4 w-4 text-primary/70" /> Password Requirements
                            </h3>
                            <div className="rounded-lg bg-muted/30 p-4 space-y-3">
                                {["Minimum 8 characters", "At least one uppercase letter", "At least one lowercase letter", "At least one number", "At least one special character"].map((r, i) => (
                                    <p key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                                        <span className="text-primary text-lg leading-none">•</span> {r}
                                    </p>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Activity Tab */}
                {activeTab === "activity" && (
                    <div className="rounded-xl border border-border/50 bg-card shadow-sm p-5 sm:p-6 animate-in fade-in duration-300">
                        <h3 className="text-base font-semibold text-primary flex items-center gap-2 mb-5 pb-3 border-b border-border">
                            <ClipboardList className="h-4 w-4 text-primary/70" /> Recent Activity
                        </h3>
                        <ActivityList profile={profile} />
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

/* ── Reusable components ── */

function FormInput({ label, value, onChange, placeholder, type = "text", disabled = false }) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">{label}</label>
            <input type={type} value={value} onChange={onChange ? e => onChange(e.target.value) : undefined}
                placeholder={placeholder} disabled={disabled}
                className={`w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${disabled ? "bg-muted cursor-not-allowed opacity-60" : ""}`}
            />
        </div>
    );
}

function PasswordInput({ label, value, onChange, show, onToggle }) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">{label}</label>
            <div className="relative">
                <input type={show ? "text" : "password"} value={value} onChange={e => onChange(e.target.value)} required
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 pr-10 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                <button type="button" onClick={onToggle}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition">
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </div>
        </div>
    );
}

function InfoItem({ label, value }) {
    return (
        <div className="rounded-lg bg-muted/30 p-3.5 border-l-4 border-primary">
            <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
            <p className="text-sm font-semibold text-foreground">{value || "—"}</p>
        </div>
    );
}

function ActivityList({ profile }) {
    const items = [
        { msg: "Profile information viewed", time: "Just now", icon: "👤" },
        ...(profile?.updatedAt ? [{ msg: "Account updated", time: new Date(profile.updatedAt).toLocaleDateString(), icon: "✏️" }] : []),
        { msg: "Logged into the portal", time: "Today", icon: "🔑" },
        ...(profile?.createdAt ? [{ msg: "Account was created", time: new Date(profile.createdAt).toLocaleDateString(), icon: "🎉" }] : []),
    ];

    return (
        <div className="divide-y divide-border">
            {items.map((item, i) => (
                <div key={i} className="py-3.5 first:pt-0 last:pb-0">
                    <p className="text-sm text-foreground flex items-center gap-2">
                        <span className="text-primary">{item.icon}</span> {item.msg}
                    </p>
                    <p className="text-xs text-muted-foreground ml-6 mt-0.5">{item.time}</p>
                </div>
            ))}
        </div>
    );
}
