import React, { useState } from "react";
import { useAuth } from "../../components/auth/AuthWrapper";
import { useNavigate } from "react-router-dom";
const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL


function JoinCoursePage() {
  const {token} = useAuth();
  const navigate = useNavigate();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [enrollementKey, setEnrollementKey] = useState('');
  const [errMessage, setErrMessage] = useState("");
  
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrMessage("");
    if (!enrollementKey) {
      setErrMessage("Please an enrollment key is required");
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/courses/join`, {
        method: 'POST',
        headers:{
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({enrollementKey})
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to join course');
      }
      setShowSuccessModal(true);
    } catch (error) {
      console.log("Error: ", error);
      setErrMessage(error.message || 'Failed to join course');
    }
  }
  return (
    <div className="join-course-page">
      <div className="join-course-header">
        <h3>Join Course</h3>
        <p>Enrol in a new course and take assessments without AI distractions</p>
      </div>

      <form className="join-course-form" onSubmit={handleSubmit}>
        <input type="text" placeholder="e.g., MECHut7H" required onChange={(e) =>{ setEnrollementKey(e.target.value) }}/>
        {errMessage && <p className="error-message">{errMessage}</p>}
        <button type="submit">Join Course</button>
      </form>
      {showSuccessModal && (
        <div className="join-course-modal-backdrop">
          <div className="join-course-modal">
            <h3>Course joined successfully</h3>
            <p>You have been enrolled in the course</p>
            <button type="button" className="join-course-modal-btn" onClick={() => {
              setShowSuccessModal(false)
              navigate("/courses")
            }}>Go to Courses</button>
          </div>
        </div>
      )}
    </div>
  );
}
export default JoinCoursePage;
