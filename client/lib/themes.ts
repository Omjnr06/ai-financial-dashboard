
export type Theme = {
  surface: string;        // page background
  surfaceRaised: string;  // cards, inputs
  textPrimary: string;    // headings, main text
  textMuted: string;      // labels, hints
  accent: string;         // links, primary buttons, focus
  borderSubtle: string;   // borders, dividers
  danger: string;         // errors
  success: string;        // positive / on-track
  warning: string;        // warnings
};

export const THEMES: Record<string, Theme> = {
  midnight: {
    surface: "#0F1535",
    surfaceRaised: "#1A1F45",
    textPrimary: "#FFFFFF",
    textMuted: "#A0AEC0",
    accent: "#2CD9FF",
    borderSubtle: "#2D3561",
    danger: "#E01E5A",
    success: "#2EB67D",
    warning: "#ECB22E",
  },
  mono: {
    surface: "#141414",
    surfaceRaised: "#1F1F1F",
    textPrimary: "#F5F5F5",
    textMuted: "#8A8A8A",
    accent: "#B8C4D0",    
    borderSubtle: "#333333",
    danger: "#D45B5B",      
    success: "#6BAF8D",
    warning: "#C9A961",
  },
  neon: {
    surface: "#0A0A12",      
    surfaceRaised: "#15121F",
    textPrimary: "#F0EBFF",
    textMuted: "#7A7295",
    accent: "#00E5FF",        
    borderSubtle: "#2A2440",
    danger: "#FF3B6B",
    success: "#3BFFB0",
    warning: "#FFD43B",
  },
  pink: {
    surface: "#1E1018",      
    surfaceRaised: "#2A1622",
    textPrimary: "#FBEEF4",
    textMuted: "#B08A9C",
    accent: "#FF8FB1",        
    borderSubtle: "#3D2230",
    danger: "#FF5C7A",
    success: "#5FCf9E",
    warning: "#F0B860",
  },
  daylight: {
    surface: "#F7F8FA",       
    surfaceRaised: "#FFFFFF",
    textPrimary: "#0F1535",   
    textMuted: "#64748B",
    accent: "#0891B2",        
    borderSubtle: "#E2E8F0",
    danger: "#DC2626",
    success: "#16A34A",
    warning: "#D97706",
  },
};