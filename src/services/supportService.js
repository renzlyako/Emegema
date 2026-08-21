// src/services/supportService.js
import { supabase } from "./supabase";

export async function canSendSupportRequest(userId) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("support_requests")
    .select("id")
    .eq("user_id", userId)
    .gte("created_at", startOfDay.toISOString());

  if (error) throw new Error(error.message);
  return data.length === 0;
}

export async function sendSupportRequest({ userId, userRole, requestType, subject, message }) {
  const allowed = await canSendSupportRequest(userId);
  if (!allowed) {
    throw new Error("You can only send one message per day. Please try again tomorrow.");
  }

  const { data, error } = await supabase
    .from("support_requests")
    .insert([{
      user_id: userId,
      user_role: userRole,
      request_type: requestType,
      subject,
      message,
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getMySupportRequests(userId) {
  const { data, error } = await supabase
    .from("support_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

// ── ADMIN ──

export async function getAllSupportRequests() {
  const { data: requests, error } = await supabase
    .from("support_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const userIds = [...new Set((requests || []).map(r => r.user_id).filter(Boolean))];
  let profileMap = {};

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);
    (profiles || []).forEach(p => { profileMap[p.id] = p; });
  }

  return (requests || []).map(r => ({
    ...r,
    userName:  profileMap[r.user_id]?.full_name ?? "Unknown User",
    userEmail: profileMap[r.user_id]?.email ?? "",
  }));
}

export async function respondToSupportRequest(id, { adminResponse, status }) {
  const { data, error } = await supabase
    .from("support_requests")
    .update({
      admin_response: adminResponse,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}