import React, { useState, useEffect } from 'react';

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
} from 'react-router-dom';

import AuthPage from './components/authPage';
import Chat from './components/chat';
import PostReport from './components/postReport';
import AdminReports from './components/adminReports';
import ResetPassword from './components/resetPassword';
import Footer from './components/footer';

import './App.css';

function AppContent() {
  const [userRole, setUserRole] = useState(null);
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const location = useLocation();

  // Close the mobile sidebar whenever the route changes.
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close the sidebar when switching to desktop view.
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Prevent background scrolling while the mobile sidebar is open.
  useEffect(() => {
    if (sidebarOpen && window.innerWidth <= 768) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const handleLogout = () => {
    setUserRole(null);
    setAuthenticatedUser(null);
    setSidebarOpen(false);

    // Clear stored authentication information.
    localStorage.removeItem('token');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('groupToken');
    localStorage.removeItem('user');
  };

  // Display the authenticated user's name.
  const userName = authenticatedUser
    ? [
        authenticatedUser.lastName,
        authenticatedUser.middleName,
        authenticatedUser.firstName,
      ]
        .filter(Boolean)
        .join(' ') || authenticatedUser.name
    : '';

  return (
    <div className="app-container">
      {/* Floating Navigation Bar */}
      <header className="floating-header">
        <nav className="top-navbar">
          {/* Logo */}
          <Link to="/" className="brand-logo">
            SLEEQORA
          </Link>

          {/* Desktop Navigation */}
          <div className="desktop-navigation">
            {authenticatedUser ? (
              <>
                <div className="user-information">
                  <span className="user-name">{userName}</span>

                  <span
                    className="account-status"
                    title="Activated Account"
                  />
                </div>

                <Link to="/chat" className="nav-link">
                  Chat
                </Link>

                {userRole === 'learner' && (
                  <Link to="/post-report" className="nav-link">
                    Post Report
                  </Link>
                )}

                {userRole === 'admin' && (
                  <Link to="/admin/reports" className="nav-link">
                    Admin Reports
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="logout-button"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link to="/auth" className="nav-link">
                Login / Register
              </Link>
            )}
          </div>

          {/* Mobile Toggle Button */}
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={sidebarOpen}
            aria-controls="mobile-sidebar"
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
        </nav>
      </header>

      {/* Mobile Sidebar Overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile Sidebar */}
      <aside
        id="mobile-sidebar"
        className={`mobile-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}
        aria-label="Mobile navigation"
        aria-hidden={!sidebarOpen}
      >
        <div className="sidebar-header">
          <Link
            to="/"
            className="sidebar-brand"
            onClick={() => setSidebarOpen(false)}
          >
            SLEEQORA
          </Link>

          <button
            type="button"
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation menu"
            tabIndex={sidebarOpen ? 0 : -1}
          >
            ✕
          </button>
        </div>

        {authenticatedUser && (
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {userName.charAt(0).toUpperCase() || 'U'}
            </div>

            <div className="sidebar-user-details">
              <span className="sidebar-user-name">
                {userName || 'User'}
              </span>

              <span className="sidebar-user-role">
                {userRole === 'admin' ? 'Administrator' : 'Group Lead'}
              </span>

              <span className="sidebar-status">
                <span className="account-status" />
                Active account
              </span>
            </div>
          </div>
        )}

        <div className="sidebar-navigation">
          {authenticatedUser ? (
            <>
              <Link
                to="/chat"
                className={`sidebar-link ${
                  location.pathname === '/chat' ? 'active' : ''
                }`}
                tabIndex={sidebarOpen ? 0 : -1}
              >
                <span className="sidebar-icon">💬</span>
                <span>Chat</span>
              </Link>

              {userRole === 'learner' && (
                <Link
                  to="/post-report"
                  className={`sidebar-link ${
                    location.pathname === '/post-report' ? 'active' : ''
                  }`}
                  tabIndex={sidebarOpen ? 0 : -1}
                >
                  <span className="sidebar-icon">📝</span>
                  <span>Post Report</span>
                </Link>
              )}

              {userRole === 'admin' && (
                <Link
                  to="/admin/reports"
                  className={`sidebar-link ${
                    location.pathname === '/admin/reports' ? 'active' : ''
                  }`}
                  tabIndex={sidebarOpen ? 0 : -1}
                >
                  <span className="sidebar-icon">📊</span>
                  <span>Admin Reports</span>
                </Link>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="sidebar-logout"
                tabIndex={sidebarOpen ? 0 : -1}
              >
                <span className="sidebar-icon">🚪</span>
                <span>Logout</span>
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className={`sidebar-link ${
                location.pathname === '/auth' ? 'active' : ''
              }`}
              tabIndex={sidebarOpen ? 0 : -1}
            >
              <span className="sidebar-icon">🔐</span>
              <span>Login / Register</span>
            </Link>
          )}
        </div>

        <div className="sidebar-footer">
          <span>SLEEQORA Group Portal</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <Routes>
          {/* Homepage */}
          <Route
            path="/"
            element={
              <Navigate
                to={authenticatedUser ? '/chat' : '/auth'}
                replace
              />
            }
          />

          {/* Login and Registration */}
          <Route
            path="/auth"
            element={
              <AuthPage
                setUserRole={setUserRole}
                setAuthenticatedUser={setAuthenticatedUser}
              />
            }
          />

          {/* Password Reset */}
          <Route
            path="/reset-password/:token"
            element={<ResetPassword />}
          />

          {/* Chat */}
          <Route
            path="/chat"
            element={
              authenticatedUser ? (
                <Chat user={authenticatedUser} />
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />

          {/* Learner Report Submission */}
          <Route
            path="/post-report"
            element={
              authenticatedUser && userRole === 'learner' ? (
                <PostReport user={authenticatedUser} />
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />

          {/* Admin Reports */}
          <Route
            path="/admin/reports"
            element={
              authenticatedUser && userRole === 'admin' ? (
                <AdminReports />
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />

          {/* Catch-All Route */}
          <Route
            path="*"
            element={
              <Navigate
                to={authenticatedUser ? '/chat' : '/auth'}
                replace
              />
            }
          />
        </Routes>
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;