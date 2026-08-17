import {
  Layers,
  Cpu,
  MousePointer,
  Activity
} from "lucide-react";

export const features = [
  {
    icon: <Layers className="w-5 h-5" />,
    title: "Coral & Polyp Segmentation",
    description: "Semi-automated tool specifically designed for coral and polyp image segmentation using advanced AI models.",
  },
  {
    icon: <Cpu className="w-5 h-5" />,
    title: "Deep Learning + Prompting",
    description: "Combines deep learning and prompt-based models for both automatic and interactive segmentation workflows.",
  },
  {
    icon: <MousePointer className="w-5 h-5" />,
    title: "Multi-Modal Prompting",
    description: "Support for point, box, circle, and polygon prompts with positive/negative labeling for precise control.",
  },
  {
    icon: <Activity className="w-5 h-5" />,
    title: "Morphological Analysis",
    description: "Quantify morphological traits and changes with visual overlays and downloadable reports.",
  }
];

export const capabilities = [
  "Semi-automated coral structure segmentation",
  "Interactive prompting tools (point, box, circle, polygon)",
  "Multiple annotation support",
  "Morphological trait quantification",
  "Export Quantification Reports",
  "Zoom and pan controls for detailed work"
];

export const workflowSteps = [
  {
    step: "1",
    title: "Select or Upload Images",
    description: "Choose coral images from the left panel or upload your own datasets",
  },
  {
    step: "2",
    title: "Choose Prompting Tools",
    description: "Use point, box, circle, or polygon prompts for precise segmentation control",
  },
  {
    step: "3",
    title: "Interactive Annotation",
    description: "Left-click for positive point Annotations, right-click for negative point Annotations",
  },
  {
    step: "4",
    title: "Analyze & Export",
    description: "Use zoom controls for detailed work and save quantification reports",
  }
];
