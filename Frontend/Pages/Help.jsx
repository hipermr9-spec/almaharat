// That Page For help user.
import React, { useEffect, useState } from "react"
import "./App.css"


export default function Help() {
    return (
        <div className="help-container">
            <h1 className="help-title">منصة المهارات التعليمية</h1>
            <p className="help-desc">مرحباً بك في صفحة المساعدة! إذا كنت تواجه أي مشكلة أو لديك أي استفسار، لا تترددي في دخول في صفحة مساعدة.</p>
                <div className="help-links">
                <a href="Help/Verify/requirements" className="btn-main">متطلبات التحقق</a>
                <a href="Help/Verify/steps" className="btn-main">خطوات التحقق</a>
            </div>
            <p className="help-section">مزيد من مساعدة قريبا.</p>
        </div>
    )
}