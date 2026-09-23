import React, { useRef, useState } from 'react';
import { Camera, Loader2, User } from 'lucide-react';
import { userService } from '../../services/userService';

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string | null;
  userName: string;
  size?: 'sm' | 'md' | 'lg';
  onSuccess?: (newUrl: string) => void;
  onError?: (errorMessage: string) => void;
  readOnly?: boolean;
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  userId,
  currentAvatarUrl,
  userName,
  size = 'lg',
  onSuccess,
  onError,
  readOnly = false,
}) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper for user initials
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image type
    if (!file.type.startsWith('image/')) {
      onError?.('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).');
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      onError?.('A foto deve ter no máximo 5MB.');
      return;
    }

    setIsUploading(true);
    const { publicUrl, error } = await userService.uploadAvatar(userId, file);
    setIsUploading(false);

    if (error) {
      onError?.(`Erro no upload: ${error}`);
    } else if (publicUrl) {
      setAvatarUrl(publicUrl);
      onSuccess?.(publicUrl);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerSelectFile = () => {
    if (readOnly || isUploading) return;
    fileInputRef.current?.click();
  };

  const sizeClasses = {
    sm: 'w-10 h-10 text-xs',
    md: 'w-16 h-16 text-base',
    lg: 'w-24 h-24 text-xl',
  }[size];

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }[size];

  return (
    <div className="relative inline-block group shrink-0">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        disabled={readOnly || isUploading}
      />

      <div
        onClick={triggerSelectFile}
        className={`${sizeClasses} rounded-full overflow-hidden relative shadow-md border-2 border-slate-200 dark:border-slate-800 transition-all ${
          !readOnly ? 'cursor-pointer hover:border-amber-400 group-hover:shadow-lg' : ''
        } flex items-center justify-center bg-slate-950 text-amber-400 font-extrabold`}
      >
        {/* Render Image or Initials */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={userName}
            className="w-full h-full object-cover"
            onError={() => setAvatarUrl(null)}
          />
        ) : (
          <span className="font-display tracking-wider">
            {getInitials(userName)}
          </span>
        )}

        {/* Hover Camera Overlay (if editable) */}
        {!readOnly && !isUploading && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1">
            <Camera className={iconSizes} />
            {size === 'lg' && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                Alterar
              </span>
            )}
          </div>
        )}

        {/* Loading Spinner Overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[1px] flex flex-col items-center justify-center text-amber-400">
            <Loader2 className={`${iconSizes} animate-spin`} />
            {size === 'lg' && (
              <span className="text-[9px] font-bold text-slate-200 mt-1">
                Enviando...
              </span>
            )}
          </div>
        )}
      </div>

      {/* Camera badge indicator for large avatar */}
      {!readOnly && size === 'lg' && !isUploading && (
        <button
          type="button"
          onClick={triggerSelectFile}
          className="absolute bottom-0 right-0 p-2 rounded-full bg-amber-400 text-slate-950 shadow-md hover:bg-amber-300 transition-transform active:scale-95 cursor-pointer border-2 border-white dark:border-slate-900"
          title="Alterar foto de perfil"
        >
          <Camera className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
