import React, { useState, useContext, createContext } from 'react'
import { Outlet } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL
const CourseContext = createContext()


export const CourseWrapper = ({children}) => {
    const [courseData, setCourseData] = useState(null);
    
    return <CourseContext.Provider value={{ courseData, setCourseData }}>{children}</CourseContext.Provider>;
}

export const useCourseContext = () => {
    const context = useContext(CourseContext);
    if (!context) {
        throw new Error("useCourseContext must be used within a CourseProvider");
    }
    return context;
};