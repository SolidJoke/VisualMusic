import React from "react";
import AppDesktop from "./AppDesktop";

export default function AppMobile() {
  // Mobile breakpoint now delegates to AppDesktop which dynamically adapts its UI via CSS and hooks
  return <AppDesktop />;
}
