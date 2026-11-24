import { z } from "zod";

export const inviteMemberSchema = z.object({
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  roleId: z.string().uuid("Invalid role ID"),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Invitation token is required"),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
