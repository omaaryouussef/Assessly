import React, { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useAuth } from "./auth/AuthWrapper";
import { useCourseContext } from "../../contexts/CourseContext";
import SidebarItem from "./SidebarItem";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faArrowLeft,
    faArrowRight,
} from "@fortawesome/free-solid-svg-icons";

function Sidebar(){
    const {user} = useAuth();
    const {courseData, setCourseData} = useCourseContext();
    const courseTitle = courseData?.coursetitle ?? "";
    const location = useLocation();
    const showSidebar = location.pathname.includes("course/");
    const { courseId } = useParams();
    const [isExpanded, setIsExpanded] = useState(() => {
        const saved = localStorage.getItem("sidebar_expanded");
        return saved === null ? true : saved === "true";
    });

    // On refresh, CourseContext resets. Restore the selected course title from localStorage.
    useEffect(() => {
        if (!courseId) return;
        if (courseData?.course_id) return;

        const raw = localStorage.getItem("selected_course");
        if (!raw) return;

        try {
            const parsed = JSON.parse(raw);
            if (String(parsed?.course_id) === String(courseId)) {
                setCourseData(parsed);
            }
        } catch {
            // ignore invalid localStorage values
        }
    }, [courseId, courseData, setCourseData]);

    // Let the layout (CSS) know whether sidebar is expanded
    useEffect(() => {
        document.documentElement.dataset.sidebar = isExpanded ? "expanded" : "collapsed";
        localStorage.setItem("sidebar_expanded", String(isExpanded));
    }, [isExpanded]);

    if (!showSidebar || !courseId) {
        return null;
    }
    if (!isExpanded) {
        return (
            <button
                type="button"
                className="sidebar-expand-button"
                onClick={() => setIsExpanded(true)}
                aria-label="Expand menu"
            >
                <FontAwesomeIcon icon={faArrowRight} />
            </button>
        );
    }

    return (
        showSidebar && (
            <div className="sidebar-container">
                <div className="sidebar-header">
                    <p>SELECTED COURSE</p>
                    <h3>{courseTitle}</h3>
                </div>
                <ul className="sidebar-links">
                    <SidebarItem title="Home" path={`/course/${courseId}/home`} />
                    <SidebarItem title="Assignments" path={`/course/${courseId}/assignments`} />
                    <SidebarItem title="Quizzes" path={`/course/${courseId}/quizzes`} />
                    <SidebarItem title="Exams" path={`/course/${courseId}/exams`} />
                    <SidebarItem title="Grades" path={user.role == "INSTRUCTOR" ? `/course/${courseId}/view-all-students-grade`:`/course/${courseId}/view-grades`} />
                    <SidebarItem title="People" path={`/course/${courseId}/people`} />
                    {user.role == "INSTRUCTOR" && <SidebarItem title="Assessment Studio" path={`/course/${courseId}/assessment-studio`} />}
                </ul>
                <button type="button" className="sidebar-collapse-button" onClick={() => setIsExpanded(false)}>
                    <FontAwesomeIcon icon={faArrowLeft} /> Collapse Menu
                </button>
            </div>
        )
    );
}

export default Sidebar;