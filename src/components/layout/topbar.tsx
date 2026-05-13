import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface TopbarProps {
  userName: string;
  userEmail: string;
  userAvatar?: string;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Topbar({ userName, userEmail, userAvatar }: TopbarProps) {
  return (
    <header className="h-14 flex items-center justify-end gap-3 px-6 bg-white border-b border-gray-100 flex-shrink-0 w-full">
      <div className="flex items-center gap-2.5">
        <Avatar className="w-8 h-8">
          <AvatarImage src={userAvatar} alt={userName} />
          <AvatarFallback
            className="text-xs font-medium text-white"
            style={{ backgroundColor: "#6B4EFF" }}
          >
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-medium text-gray-900">{userName}</span>
          <span className="text-xs text-gray-400 hidden sm:block">{userEmail}</span>
        </div>
      </div>

      <form action={signOut}>
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          className="text-gray-400 hover:text-gray-600"
          title="Cerrar sesión"
        >
          <LogOut size={16} />
        </Button>
      </form>
    </header>
  );
}
