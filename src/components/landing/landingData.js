import { 
  Brain, 
  Database, 
  Award,
  TrendingUp,
  Users, 
  BarChart3,
  Microscope,
  Target
} from "lucide-react";

export const features = [
  {
    icon: <Microscope className="w-8 h-8" />,
    title: "Coral & Polyp Segmentation",
    description: "Semi-automated tool specifically designed for coral and polyp image segmentation using advanced AI models.",
    gradient: "from-emerald-400 to-teal-600"
  },
  {
    icon: <Brain className="w-8 h-8" />,
    title: "Deep Learning + Prompting",
    description: "Combines deep learning and prompt-based models for both automatic and interactive segmentation workflows.",
    gradient: "from-blue-400 to-cyan-600"
  },
  {
    icon: <Target className="w-8 h-8" />,
    title: "Multi-Modal Prompting",
    description: "Support for point, box, circle, and polygon prompts with positive/negative labeling for precise control.",
    gradient: "from-purple-400 to-indigo-600"
  },
  {
    icon: <BarChart3 className="w-8 h-8" />,
    title: "Morphological Analysis",
    description: "Quantify morphological traits and changes with visual overlays and downloadable reports.",
    gradient: "from-orange-400 to-red-500"
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
    color: "from-emerald-400 to-teal-500"
  },
  {
    step: "2",
    title: "Choose Prompting Tools",
    description: "Use point, box, circle, or polygon prompts for precise segmentation control",
    color: "from-blue-400 to-indigo-500"
  },
  {
    step: "3",
    title: "Interactive Annotation",
    description: "Left-click for positive point Annotations, right-click for negative point Annotations",
    color: "from-purple-400 to-pink-500"
  },
  {
    step: "4",
    title: "Analyze & Export",
    description: "Use zoom controls for detailed work and save quantification reports",
    color: "from-orange-400 to-red-500"
  }
]; 