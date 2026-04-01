// script.js

import React, { useEffect, useState } from "react";
import { FaEdit } from "react-icons/fa";
import { toast } from "react-toastify";
import { getProfile, updateProfile } from "../services/profileService";

const Profile = () => {
  const [profile, setProfile] = useState({});
  const [formData, setFormData] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Load profile
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await getProfile();

      setProfile(data);
      setFormData(data);
    } catch (err) {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  // Username fallback logic
  const displayName =
    profile.username ||
    `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
    profile.email;

  // ✏️ Handle change
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Validation
  const validate = () => {
    let newErrors = {};

    if (!formData.first_name) newErrors.first_name = "First name required";
    if (!formData.last_name) newErrors.last_name = "Last name required";

    if (!formData.email) {
      newErrors.email = "Email required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email";
    }

    if (!formData.phone) newErrors.phone = "Phone required";
    if (!formData.address) newErrors.address = "Address required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save
  const handleSave = async () => {
    if (!validate()) return;

    try {
      setLoading(true);

      const updated = await updateProfile(formData);

      setProfile(updated);
      setFormData(updated);
      setEditMode(false);

      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(err.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  // Cancel
  const handleCancel = () => {
    setFormData(profile);
    setEditMode(false);
    setErrors({});
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Profile</h2>

      {/* Avatar + Name */}
      <div>
        <img
          src={profile.avatar || "https://via.placeholder.com/100"}
          alt="avatar"
          style={{ width: "100px", borderRadius: "50%" }}
        />

        <h3>{displayName}</h3>

        {!editMode && (
          <FaEdit
            style={{ cursor: "pointer" }}
            onClick={() => setEditMode(true)}
          />
        )}
      </div>

      {/* Form Fields */}
      {["first_name", "last_name", "email", "phone", "address"].map(
        (field) => (
          <div key={field}>
            <label>{field}</label>

            <input
              name={field}
              value={formData[field] || ""}
              onChange={handleChange}
              disabled={!editMode}
            />

            {errors[field] && (
              <p style={{ color: "red" }}>{errors[field]}</p>
            )}
          </div>
        )
      )}

      {/* Buttons */}
      {editMode && (
        <div>
          <button onClick={handleSave}>Save</button>
          <button onClick={handleCancel}>Cancel</button>
        </div>
      )}
    </div>
  );
};

export default Profile;