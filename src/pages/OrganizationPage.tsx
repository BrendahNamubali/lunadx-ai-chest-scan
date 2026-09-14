import { useState } from "react";
import { getCurrentUser, getOrgMembers, getInvites, createInvite, deleteInvite, getOrganization, type UserRole } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Building2, MapPin, Users, Mail, Plus, Trash2, Clock, CheckCircle2, Copy } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const roleBadgeColor: Record<UserRole, string> = {
  Admin: "bg-primary/10 text-primary border-primary/20",
  Radiologist: "bg-accent/10 text-accent border-accent/20",
  Clinician: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

export default function OrganizationPage() {
  const user = getCurrentUser();
  const org = user ? getOrganization(user.orgId) : undefined;
  const [members, setMembers] = useState(() => user ? getOrgMembers(user.orgId) : []);
  const [invites, setInvites] = useState(() => user ? getInvites(user.orgId) : []);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("Radiologist");
  const { toast } = useToast();

  const isAdmin = user?.role === "Admin";

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inviteEmail) return;

    // Check duplicates
    const existingMember = members.find((m) => m.email === inviteEmail);
    const existingInvite = invites.find((i) => i.email === inviteEmail && i.status === "pending");
    if (existingMember) {
      toast({ title: "Already a member", description: `${inviteEmail} is already in your organization.`, variant: "destructive" });
      return;
    }
    if (existingInvite) {
      toast({ title: "Invite pending", description: `An invite has already been sent to ${inviteEmail}.`, variant: "destructive" });
      return;
    }

    createInvite(user.orgId, inviteEmail, inviteRole);
    setInvites(getInvites(user.orgId));
    setInviteEmail("");
    toast({ title: "Invite sent", description: `Invitation sent to ${inviteEmail} as ${inviteRole}.` });
  };

  const handleDeleteInvite = (inviteId: string) => {
    deleteInvite(inviteId);
    setInvites(getInvites(user!.orgId));
    toast({ title: "Invite removed" });
  };

  if (!org || !user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Organization</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your hospital account and team members</p>
      </div>

      {/* Org Details */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">{org.name}</CardTitle>
              <CardDescription className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> {org.location}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Plan</p>
              <p className="font-semibold text-foreground capitalize">{org.plan}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Scan Limit</p>
              <p className="font-semibold text-foreground">{org.scanLimit}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Members</p>
              <p className="font-semibold text-foreground">{members.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Created</p>
              <p className="font-semibold text-foreground">{new Date(org.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" /> Team Members
              </CardTitle>
              <CardDescription>{members.length} active members</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member, i) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] ${roleBadgeColor[member.role]}`}>
                  {member.role}
                </Badge>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invite Section (Admin only) */}
      {isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="w-4 h-4" /> Invite Team Members
            </CardTitle>
            <CardDescription>Send invitations to doctors and clinicians to join your organization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label htmlFor="invite-email" className="sr-only">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="doctor@hospital.com"
                  required
                />
              </div>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as UserRole)}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Radiologist">Radiologist</SelectItem>
                  <SelectItem value="Clinician">Clinician</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" className="cta-gradient text-cta-foreground border-0 hover:opacity-90">
                <Plus className="w-4 h-4 mr-1" /> Invite
              </Button>
            </form>

            {invites.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pending Invitations</p>
                  {invites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50">
                      <div className="flex items-center gap-3">
                        {invite.status === "pending" ? (
                          <Clock className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-accent" />
                        )}
                        <div>
                          <p className="text-sm text-foreground">{invite.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {invite.role} · {invite.status === "pending" ? "Awaiting response" : "Accepted"}
                          </p>
                        </div>
                      </div>
                      {invite.status === "pending" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteInvite(invite.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground">
              <p><strong className="text-foreground">Note:</strong> In this prototype, invites are stored locally. In production, an email with a signup link would be sent to the invited user.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Non-admin view */}
      {!isAdmin && (
        <div className="p-4 rounded-lg bg-muted/40 text-sm text-muted-foreground">
          Only organization admins can invite new team members. Contact your admin for access changes.
        </div>
      )}
    </div>
  );
}
