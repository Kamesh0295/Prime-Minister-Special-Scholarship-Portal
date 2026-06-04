import React from 'react';
import { Check } from 'lucide-react';

const ProgressSteps = ({ steps, currentStep }) => {
  return (
    <div className="flex items-start w-full">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              {/* Circle */}
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center border-2 font-semibold text-sm transition-all duration-300 ${
                  isCompleted
                    ? 'bg-primary border-primary text-white'
                    : isActive
                    ? 'border-primary text-primary bg-white shadow-[0_0_0_4px_rgba(37,99,235,0.12)]'
                    : 'border-gray-200 text-gray-400 bg-white'
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4" strokeWidth={3} /> : index + 1}
              </div>

              {/* Label */}
              <span
                className={`text-xs font-medium text-center max-w-[80px] leading-tight ${
                  isActive ? 'text-primary' : isCompleted ? 'text-gray-600' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className={`flex-1 h-0.5 mt-4 mx-1 transition-colors duration-300 ${
                  isCompleted ? 'bg-primary' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default ProgressSteps;
