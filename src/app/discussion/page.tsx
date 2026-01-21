"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DiscussionRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/wall"); }, [router]);
  return null;
}
