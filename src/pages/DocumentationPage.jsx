import React, { useState } from "react";
import { 
  BookOpen, 
  FileText, 
  Edit3, 
  BarChart3, 
  Download, 
  HelpCircle 
} from "lucide-react";

import {
  DocumentationHeader,
  DocumentationNavigation,
  SectionHeader,
  GettingStartedSection,
  DatasetsSection,
  AnnotationSection,
  AISegmentationSection,
  QuantificationSection,
  ExportSection,
  TroubleshootingSection
} from "../components/documentation";

const DocumentationPage = () => {
  const [expandedSections, setExpandedSections] = useState({
    gettingStarted: true,
    datasets: false,
    annotation: false,
    aiSegmentation: false,
    quantification: false,
    export: false,
    troubleshooting: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const sections = [
    {
      id: "gettingStarted",
      title: "Getting Started",
      icon: BookOpen,
      component: GettingStartedSection
    },
    {
      id: "datasets",
      title: "Dataset Management",
      icon: FileText,
      component: DatasetsSection
    },
    {
      id: "annotation",
      title: "Annotation Tools",
      icon: Edit3,
      component: AnnotationSection
    },
    {
      id: "aiSegmentation",
      title: "AI Segmentation",
      icon: BarChart3,
      component: AISegmentationSection
    },
    {
      id: "quantification",
      title: "Quantification Analysis",
      icon: BarChart3,
      component: QuantificationSection
    },
    {
      id: "export",
      title: "Export & Download",
      icon: Download,
      component: ExportSection
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      icon: HelpCircle,
      component: TroubleshootingSection
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <DocumentationHeader />
      <DocumentationNavigation 
        expandedSections={expandedSections}
        toggleSection={toggleSection}
      />

      <div className="max-w-[98%] mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {sections.map(({ id, title, icon: Icon, component: Component }) => (
            <SectionHeader
              key={id}
              id={id}
              title={title}
              icon={Icon}
              expanded={expandedSections[id]}
              onToggle={toggleSection}
            >
              <Component />
            </SectionHeader>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DocumentationPage; 