import React from 'react';
import { Database, Brain, BarChart3, Tag, Play } from 'lucide-react';
import ManagementCard from './ManagementCard';

const ManagementCardsView = ({
  onDataManagementClick,
  onModelZooClick,
  onQuantificationsClick,
  onStartAnnotation,
  onLabelManagementClick,
}) => {
  const cards = [
    {
      id: 'data-management',
      icon: Database,
      title: 'Data Management',
      description: 'Upload, organize, and manage your dataset images and files',
      onClick: onDataManagementClick,
      iconBgColor: 'bg-blue-100',
      iconHoverBgColor: 'group-hover:bg-blue-200',
      iconColor: 'text-blue-600',
    },
    {
      id: 'model-zoo',
      icon: Brain,
      title: 'Model Zoo',
      description: 'Browse, select, and manage AI models for training and inference',
      onClick: onModelZooClick,
      iconBgColor: 'bg-purple-100',
      iconHoverBgColor: 'group-hover:bg-purple-200',
      iconColor: 'text-purple-600',
    },
    {
      id: 'quantifications',
      icon: BarChart3,
      title: 'Quantifications',
      description: 'Analyze and quantify your annotated data with statistical insights',
      onClick: onQuantificationsClick,
      iconBgColor: 'bg-green-100',
      iconHoverBgColor: 'group-hover:bg-green-200',
      iconColor: 'text-green-600',
    },
    {
      id: 'start-annotation',
      icon: Play,
      title: 'Start Annotation',
      description: 'Begin annotating your images with labels and segmentation masks',
      onClick: onStartAnnotation,
      isGradient: true,
      gradientClasses: 'from-teal-500 to-teal-600',
    },
    {
      id: 'label-management',
      icon: Tag,
      title: 'Label Management',
      description: 'Create, edit, and organize labels and their hierarchical structure',
      onClick: onLabelManagementClick,
      iconBgColor: 'bg-pink-100',
      iconHoverBgColor: 'group-hover:bg-pink-200',
      iconColor: 'text-pink-600',
    },
  ];

  return (
    <div className="overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-5 lg:p-6 h-full">
      <div className="w-full mx-auto">
        <div className="mb-4 sm:mb-5">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Dataset Management</h2>
          <p className="text-sm sm:text-base text-gray-600">Manage your dataset, models, and annotations</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {cards.map((card) => (
            <ManagementCard
              key={card.id}
              icon={card.icon}
              title={card.title}
              description={card.description}
              onClick={card.onClick}
              iconBgColor={card.iconBgColor}
              iconHoverBgColor={card.iconHoverBgColor}
              iconColor={card.iconColor}
              isGradient={card.isGradient}
              gradientClasses={card.gradientClasses}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ManagementCardsView;

