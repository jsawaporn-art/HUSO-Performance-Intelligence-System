import React from 'react';

export interface HusoLogoProps {
  /**
   * 'badge': Compact square emblem (ideal for navbar, icons, 36-48px)
   * 'full': Complete official logo matching uploaded card (HUSO + Faculty of Humanities and Social Sciences)
   * 'horizontal': Emblem on left with text alongside (good for banners, headers)
   * 'icon-only': Transparent background emblem without container
   */
  variant?: 'badge' | 'full' | 'horizontal' | 'icon-only';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  className?: string;
  showEnglishSubtitle?: boolean;
  showThaiSubtitle?: boolean;
  invertedOnDark?: boolean;
}

export const HusoLogo: React.FC<HusoLogoProps> = ({
  variant = 'badge',
  size = 'md',
  className = '',
  showEnglishSubtitle = true,
  showThaiSubtitle = false,
  invertedOnDark = false,
}) => {
  // Size mapping for badge / icon
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10 sm:w-11 sm:h-11',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
    custom: '',
  };

  // 1. Full official logo matching uploaded image (Square / White background)
  if (variant === 'full') {
    return (
      <div
        className={`relative inline-flex flex-col items-center justify-center bg-white text-slate-900 rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/80 overflow-hidden select-none ${className}`}
      >
        <svg
          viewBox="0 0 360 360"
          className="w-full h-full max-w-[280px] max-h-[280px]"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* HUSO stylized letters */}
          <g id="huso-letters">
            {/* H (Official Orange #F26522) */}
            <path
              d="M 52 72 L 52 168 M 52 120 L 98 120 M 98 72 L 98 168"
              stroke="#F26522"
              strokeWidth="22"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {/* U (Official Orange #F26522) */}
            <path
              d="M 125 72 L 125 145 C 125 160 135 168 148 168 C 161 168 171 160 171 145 L 171 72"
              stroke="#F26522"
              strokeWidth="22"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {/* S (Dark Charcoal #231F20) */}
            <path
              d="M 233 92 C 230 78 217 72 201 72 C 183 72 173 83 173 98 C 173 114 185 122 203 128 C 223 134 235 142 235 156 C 235 170 221 180 201 180 C 182 180 171 170 167 156"
              stroke="#231F20"
              strokeWidth="22"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {/* O (Dark Charcoal #231F20 with Orange #F26522 core) */}
            <circle cx="282" cy="126" r="41" stroke="#231F20" strokeWidth="22" fill="none" />
            <circle cx="282" cy="126" r="21" fill="#F26522" />
          </g>

          {/* Subtitles: Faculty of Humanities and Social Sciences */}
          <text
            x="41"
            y="222"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
            fontSize="22"
            fontWeight="700"
            fill="#231F20"
            letterSpacing="-0.3"
          >
            Faculty of Humanities
          </text>
          <text
            x="41"
            y="254"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
            fontSize="22"
            fontWeight="700"
            fill="#231F20"
            letterSpacing="-0.3"
          >
            and Social Sciences
          </text>
        </svg>

        {showThaiSubtitle && (
          <div className="mt-1 text-[11px] font-semibold text-slate-600 text-center">
            คณะมนุษยศาสตร์และสังคมศาสตร์ มหาวิทยาลัยราชภัฏยะลา
          </div>
        )}
      </div>
    );
  }

  // 2. Horizontal layout: Emblem on left + Typography on right
  if (variant === 'horizontal') {
    return (
      <div className={`inline-flex items-center gap-3 select-none ${className}`}>
        {/* Emblem badge */}
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white p-1 shadow-md border border-slate-200/80 shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 320 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M 38 45 L 38 155 M 38 100 L 88 100 M 88 45 L 88 155"
              stroke="#F26522"
              strokeWidth="24"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M 118 45 L 118 128 C 118 145 130 155 145 155 C 160 155 172 145 172 128 L 172 45"
              stroke="#F26522"
              strokeWidth="24"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M 240 68 C 236 52 222 45 204 45 C 184 45 173 57 173 74 C 173 92 186 101 206 108 C 228 115 242 124 242 140 C 242 156 226 167 204 167 C 182 167 170 156 166 140"
              stroke="#231F20"
              strokeWidth="24"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <circle cx="270" cy="100" r="46" stroke="#231F20" strokeWidth="24" fill="none" />
            <circle cx="270" cy="100" r="23" fill="#F26522" />
          </svg>
        </div>

        {/* Text block */}
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-sm sm:text-base text-slate-900 dark:text-white tracking-tight">
              HUSO Performance Intelligence
            </span>
          </div>
          {showThaiSubtitle && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
              คณะมนุษยศาสตร์และสังคมศาสตร์ มหาวิทยาลัยราชภัฏยะลา
            </span>
          )}
          {showEnglishSubtitle && (
            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider">
              Faculty of Humanities and Social Sciences
            </span>
          )}
        </div>
      </div>
    );
  }

  // 3. Badge variant: Official white square badge with crisp HUSO emblem
  // Designed to look pristine on both dark headers (Navbar, Login) and light surfaces
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-xl bg-white p-1 sm:p-1.5 shadow-md shadow-amber-500/10 border border-slate-200/90 shrink-0 select-none overflow-hidden ${
        size !== 'custom' ? sizeClasses[size] : ''
      } ${className}`}
      title="คณะมนุษยศาสตร์และสังคมศาสตร์ มหาวิทยาลัยราชภัฏยะลา (HUSO)"
    >
      <svg
        viewBox="0 0 340 220"
        className="w-full h-full object-contain"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* H (Orange #F26522) */}
        <path
          d="M 38 50 L 38 160 M 38 105 L 88 105 M 88 50 L 88 160"
          stroke="#F26522"
          strokeWidth="24"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* U (Orange #F26522) */}
        <path
          d="M 118 50 L 118 132 C 118 150 130 160 145 160 C 160 160 172 150 172 132 L 172 50"
          stroke="#F26522"
          strokeWidth="24"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* S (Dark Charcoal #231F20) */}
        <path
          d="M 242 72 C 238 56 224 48 206 48 C 186 48 175 60 175 78 C 175 96 188 105 208 112 C 230 119 244 128 244 144 C 244 160 228 172 206 172 C 184 172 172 160 168 144"
          stroke="#231F20"
          strokeWidth="24"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* O (Dark Charcoal #231F20 with center Orange #F26522 dot) */}
        <circle cx="282" cy="110" r="48" stroke="#231F20" strokeWidth="24" fill="none" />
        <circle cx="282" cy="110" r="24" fill="#F26522" />
      </svg>
    </div>
  );
};

export default HusoLogo;
