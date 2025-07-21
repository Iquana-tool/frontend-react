import {Database, 
  Award,
  TrendingUp,
  Users,
  Layers,
  Cpu,
  MousePointer,
  Activity
} from "lucide-react";

export const features = [
  {
    icon: <Layers className="w-8 h-8" />,
    title: "Coral & Polyp Segmentation",
    description: "Semi-automated tool specifically designed for coral and polyp image segmentation using advanced AI models.",
    gradient: "from-teal-400 to-cyan-600"
  },
  {
    icon: <Cpu className="w-8 h-8" />,
    title: "Deep Learning + Prompting",
    description: "Combines deep learning and prompt-based models for both automatic and interactive segmentation workflows.",
    gradient: "from-teal-400 to-cyan-600"
  },
  {
    icon: <MousePointer className="w-8 h-8" />,
    title: "Multi-Modal Prompting",
    description: "Support for point, box, circle, and polygon prompts with positive/negative labeling for precise control.",
    gradient: "from-teal-400 to-cyan-600"
  },
  {
    icon: <Activity className="w-8 h-8" />,
    title: "Morphological Analysis",
    description: "Quantify morphological traits and changes with visual overlays and downloadable reports.",
    gradient: "from-teal-400 to-cyan-600"
  }
];

export const stats = [
  { value: "X%", label: "Segmentation Accuracy", icon: <Award className="w-6 h-6" /> },
  { value: "X", label: "Faster Analysis", icon: <TrendingUp className="w-6 h-6" /> },
  { value: "X+", label: "Research Papers", icon: <Database className="w-6 h-6" /> },
  { value: "X+", label: "Marine Labs", icon: <Users className="w-6 h-6" /> }
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
    color: "from-teal-400 to-cyan-600"
  },
  {
    step: "2",
    title: "Choose Prompting Tools",
    description: "Use point, box, circle, or polygon prompts for precise segmentation control",
    color: "from-teal-400 to-cyan-600"
  },
  {
    step: "3",
    title: "Interactive Annotation",
    description: "Left-click for positive point Annotations, right-click for negative point Annotations",
    color: "from-teal-400 to-cyan-600"
  },
  {
    step: "4",
    title: "Analyze & Export",
    description: "Use zoom controls for detailed work and save quantification reports",
    color: "from-teal-400 to-cyan-600"
  }
]; 