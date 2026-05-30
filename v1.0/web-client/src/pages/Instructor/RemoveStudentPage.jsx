import React from "react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../components/auth/AuthWrapper";

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL

function RemoveStudentPage() {
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errMessage, setErrMessage] = useState('');
  const { courseId } = useParams()
  const { user } = useAuth()
  const { token } = useAuth()
  const handleRemoveStudent = async (e) => {
    e.preventDefault()
    setErrMessage('')
    if (!courseId || !token) {
      setErrMessage('Please select a course to remove a student')
      return
    }
    try {
      const response = await fetch(`${API_BASE}/api/courses/${courseId}/remove-student`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove student')
      }
      setShowSuccessModal(true)
    } catch (error) {
      console.error('Failed to remove student', error)
      setErrMessage(error.message || 'Failed to remove student')
    }
  }
  return (
    <div className="remove-student-page">
      <header className="remove-student-header">
        <h2>Remove Student</h2>
        <p>Remove a student from the course</p>
      </header>
      <form className="remove-student-form" onSubmit={handleRemoveStudent}>
        <div className="form-group">
          <label htmlFor="student-select">Select Student</label>
        </div>
      </form>
    </div>
  );
}

export default RemoveStudentPage;
