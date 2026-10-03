import {
  Download,
  Droplet,
  Fuel,
  Info,
  LogOut,
  Map as MapIcon,
  MessageSquare,
  Megaphone,
  Navigation,
  Shield,
  User,
  X,
  Zap,
} from 'lucide-react'

// One place to swap the icon set, and it keeps constants.js free of JSX so the
// Node importer can keep importing it.
export const TYPE_ICONS = {
  power: Zap,
  water: Droplet,
  fuel: Fuel,
}

export const MENU_ICONS = {
  community: MessageSquare,
  profile: User,
  recenter: Navigation,
  official: Megaphone,
  admin: Shield,
  legend: MapIcon,
  about: Info,
  install: Download,
  signOut: LogOut,
}

export { X as CloseIcon, Megaphone as MegaphoneIcon, Navigation as NavigationIcon }
