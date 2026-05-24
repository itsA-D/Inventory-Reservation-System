'use client'

import * as React from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Maximize2, X, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImageViewerProps {
  src: string
  alt: string
  className?: string
}

export function ImageViewer({ src, alt, className }: ImageViewerProps) {
  const [isZoomed, setIsZoomed] = React.useState(false)

  return (
    <>
      <div className={React.useMemo(() => `relative group cursor-zoom-in overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 ${className}`, [className])} onClick={() => setIsZoomed(true)}>
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/5" />
        <Button
          variant="secondary"
          size="icon"
          className="absolute bottom-4 right-4 h-8 w-8 scale-0 opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      <AnimatePresence>
        {isZoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 md:p-10"
            onClick={() => setIsZoomed(false)}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 text-white hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation()
                setIsZoomed(false)
              }}
            >
              <X className="h-6 w-6" />
            </Button>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative h-full w-full max-w-5xl overflow-hidden rounded-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={src}
                alt={alt}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </motion.div>

            <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-full bg-zinc-900/80 px-4 py-2 text-white backdrop-blur-md">
              <span className="text-xs font-medium">{alt}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
