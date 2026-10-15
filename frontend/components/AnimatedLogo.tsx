"use client";

import React from "react";
import CognitiveLogo, { CognitiveLogoProps } from "./CognitiveLogo";

export interface AnimatedLogoProps extends CognitiveLogoProps {}

export default function AnimatedLogo(props: AnimatedLogoProps) {
  return <CognitiveLogo {...props} />;
}
