import React from 'react';
import { Image as ImageIcon } from 'lucide-react';

const EmptyState = ({ title, message, icon: Icon = ImageIcon }) => (
  <div className="absolute inset-0 flex items-center justify-center">
    <div className="text-center">
      <div className="w-14 h-14 rounded-full bg-well flex items-center justify-center mx-auto mb-[12px]">
        <Icon size={22} className="text-t3" />
      </div>
      <h3 className="text-modaltitle font-bold text-t1 mb-[4px]">{title}</h3>
      <p className="text-row text-t3">{message}</p>
    </div>
  </div>
);

export default EmptyState;
