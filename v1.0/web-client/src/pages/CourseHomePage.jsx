import React from "react";
import { useAuth } from "../components/auth/AuthWrapper";
import { useCourseContext } from "../../contexts/CourseContext";
function CourseHomePage() {
  const { token } = useAuth();
  const {courseData} = useCourseContext();
  return <h2>Course Home Page</h2>;
}

export default CourseHomePage;
