import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // ห้ามใส่ base: './' ถ้าไม่ได้ใช้ HashRouter หรือโฟลเดอร์ย่อย
  // ให้ลบ base ออก หรือใส่เป็น '/'
  base: '/', 
})
