// src/services/lectureService.js

import { supabase } from "./supabase";

export async function getLectures(courseId) {
  const { data, error } = await supabase
    .from("lectures")
    .select("id, course_id, title, description, link_url, created_at")
    .eq("course_id", courseId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createLecture({ courseId, title, description, linkUrl }) {
  const { data, error } = await supabase
    .from("lectures")
    .insert({
      course_id: courseId,
      title,
      description: description || null,
      link_url: linkUrl,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateLecture(lectureId, { title, description, linkUrl }) {
  const { data, error } = await supabase
    .from("lectures")
    .update({
      title,
      description: description || null,
      link_url: linkUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", lectureId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteLecture(lectureId) {
  const { error } = await supabase.from("lectures").delete().eq("id", lectureId);
  if (error) throw new Error(error.message);
}
