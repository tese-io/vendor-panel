import { motion } from 'motion/react'

import { TeseLogo } from '../tese-logo/tese-logo'
import { IconAvatar } from '../icon-avatar'

export default function AvatarBox ({
  checked,
  size = 48,
}: {
  checked?: boolean
  size?: number
}) {
  return (
    <IconAvatar
      size={size >= 44 ? 'xlarge' : 'small'}
      className="relative mb-4 flex items-center justify-center rounded-xl bg-transparent shadow-none after:content-none"
    >
      {checked && (
        <motion.div
          className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full border border-[rgba(0,20,5,0.15)] bg-[rgb(29,98,93)] shadow-sm"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 1.2,
            delay: 0.8,
            ease: [0, 0.71, 0.2, 1.01],
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <motion.path
              d="M5.8335 10.4167L9.16683 13.75L14.1668 6.25"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                duration: 1.3,
                delay: 1.1,
                ease: [0.1, 0.8, 0.2, 1.01],
              }}
            />
          </svg>
        </motion.div>
      )}
      <TeseLogo size={size} className="tese-auth-logo" />
    </IconAvatar>
  )
}
