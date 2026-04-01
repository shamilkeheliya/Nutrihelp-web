import { supabase } from "../supabaseClient";

// GET PROFILE
export const getProfile = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;

  const { data, error: dbError } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (dbError) throw dbError;

  return data;
};

// UPDATE PROFILE
export const updateProfile = async (formData) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("users")
    .update(formData)
    .eq("id", user.id)
    .select()
    .single();

  if (error) throw error;

  return data;
};