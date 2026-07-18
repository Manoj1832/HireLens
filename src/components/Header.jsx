import React, { useState } from 'react';

export default function Header({ searchVal, setSearchVal, onNotificationsClick, alerts, setScreen }) {
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  
  const unreadAlerts = alerts.filter(a => a.status === 'unread');

  return (
    <header className="flex justify-between items-center w-full px-8 h-16 ml-[260px] max-w-[calc(1440px-260px)] sticky top-0 bg-surface border-b border-outline-variant z-40">
      {/* Search Bar */}
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-full max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
          <input
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant rounded px-10 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-body-sm transition-all"
            placeholder="Search candidates, skills, or evidence..."
            type="text"
          />
          {searchVal && (
            <button 
              onClick={() => setSearchVal('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface text-xs font-bold font-mono"
            >
              ESC
            </button>
          )}
        </div>
      </div>

      {/* Notifications & Profile */}
      <div className="flex items-center gap-6">
        <div className="relative">
          <button 
            onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
            className="relative hover:text-primary transition-colors flex items-center p-1.5 rounded-full hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadAlerts.length > 0 && (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-error rounded-full animate-bounce"></span>
            )}
          </button>

          {showNotificationDropdown && (
            <div className="absolute right-0 mt-3 w-80 bg-surface border border-outline-variant rounded shadow-lg z-50">
              <div className="p-3 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
                <span className="font-semibold text-xs">Live Proctoring Flags</span>
                <span className="text-[10px] font-bold text-error uppercase tracking-wider">{unreadAlerts.length} Active</span>
              </div>
              <div className="max-h-60 overflow-y-auto divide-y divide-outline-variant">
                {alerts.length === 0 ? (
                  <p className="p-4 text-center text-xs text-on-surface-variant">No alerts at this time.</p>
                ) : (
                  alerts.slice(0, 4).map((alert) => (
                    <div 
                      key={alert.id} 
                      onClick={() => {
                        setShowNotificationDropdown(false);
                        setScreen('dashboard');
                      }}
                      className={`p-3 text-xs hover:bg-surface-container-low transition-colors cursor-pointer ${
                        alert.status === 'unread' ? 'bg-error-container/10' : ''
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-on-surface">{alert.candidate}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          alert.severity === 'high' ? 'bg-error-container text-on-error-container' : 'bg-surface-container-high text-on-surface-variant'
                        }`}>
                          {alert.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant leading-tight">{alert.details}</p>
                      <span className="text-[9px] text-outline block mt-1">{alert.time}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="p-2 text-center border-t border-outline-variant bg-surface-container-low">
                <button 
                  onClick={() => {
                    setShowNotificationDropdown(false);
                    onNotificationsClick();
                  }}
                  className="text-primary text-xs font-bold hover:underline"
                >
                  View All Notifications
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 border-l border-outline-variant pl-6">
          <div className="text-right hidden sm:block">
            <p className="font-semibold text-xs text-on-surface leading-none">Alexander Wright</p>
            <p className="text-[9px] text-on-surface-variant uppercase tracking-wider mt-1">Sr. Recruiter</p>
          </div>
          <img 
            className="w-8 h-8 rounded-full border border-outline-variant object-cover" 
            alt="Alexander Wright"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDzGcc1z5jtnlKN-rUsFDYmjns0baeXHKpxJotWuM9nfIzLYIt2qkX91GrckxtNX98H1bx2_CWBQ8pju0wtXYDynZCjvAYBkYyLxvRExa2v0g0Fhnj7umKJ7u4_icK5t7kFRiLWvO32KIhpvD8RBIGxqZy2FvcO2KK--VccOOB3wPRnQ09_G2kFXrHNh4m2SzQGtsRfcDz3FeP_QO3x2fRaelTe6nzNFralhQhbzd0aFNq3Z86atGGU" 
          />
        </div>
      </div>
    </header>
  );
}
