import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/TAPAPS_ad',      // 사용자가 접속하는 주소
        destination: '/admin',  // 실제 서버 내부의 경로
      },
    ];
  },
};

export default nextConfig;
