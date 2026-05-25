import { useRef, useState } from 'react'
import { Upload, X, ImageIcon } from 'lucide-react'
import { api } from '@/api/client'
import { cn } from '@/lib/utils'

function initials(name = '') {
  return name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

/**
 * Logo upload widget. Uploads to Cloudinary immediately on file select.
 * Props:
 *   value    – current logo URL (shown as preview)
 *   orgName  – used for initials fallback
 *   onChange – called with the new URL after a successful upload
 */
export function OrgLogoUpload({ value, orgName = '', onChange, className }) {
  const inputRef  = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
    if (!allowed.includes(file.type)) {
      setError('Please select a JPG, PNG, WebP, or GIF image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5 MB.')
      return
    }

    setError('')
    setUploading(true)
    try {
      const res = await api.uploadOrgLogo(file)
      onChange(res.data.data?.url ?? '')
    } catch (err) {
      setError(err.response?.data?.message ?? 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
      // Reset so the same file can be re-selected
      e.target.value = ''
    }
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange('')
    setError('')
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload organization logo"
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && !uploading && inputRef.current?.click()}
        className={cn(
          'relative flex items-center gap-4 p-3 rounded-xl border-2 border-dashed transition-colors select-none',
          uploading
            ? 'border-primary/40 bg-primary/5 cursor-wait'
            : 'border-border hover:border-primary/50 hover:bg-muted/40 cursor-pointer',
        )}
      >
        {/* Preview / placeholder */}
        <div className="w-16 h-16 rounded-lg flex-shrink-0 overflow-hidden border border-border bg-muted flex items-center justify-center">
          {value ? (
            <img
              src={value}
              alt="Logo preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-lg font-bold text-muted-foreground">
              {initials(orgName) || <ImageIcon size={20} className="text-muted-foreground/50" />}
            </span>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          {uploading ? (
            <div className="flex items-center gap-2 text-sm text-primary">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
              Uploading…
            </div>
          ) : value ? (
            <>
              <p className="text-sm font-medium text-foreground">Logo uploaded</p>
              <p className="text-xs text-muted-foreground truncate">{value}</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Upload size={14} className="flex-shrink-0" />
                Click to upload logo
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                JPG, PNG, WebP or GIF · max 5 MB
              </p>
            </>
          )}
        </div>

        {/* Clear button */}
        {value && !uploading && (
          <button
            type="button"
            aria-label="Remove logo"
            onClick={handleClear}
            className="absolute top-2 right-2 w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <X size={11} />
          </button>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
