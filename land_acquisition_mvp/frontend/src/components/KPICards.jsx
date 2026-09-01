import React from 'react'
import { FolderGit2, AlertTriangle, Activity, Target } from 'lucide-react'

export default function KPICards({ metrics }) {
  const cards = [
    {
      title: 'Active Projects',
      value: metrics?.total?.toLocaleString() || '0',
      icon: <FolderGit2 className="text-blue-500" size={24} />,
      bgColor: 'bg-white',
      textColor: 'text-gray-900'
    },
    {
      title: 'Critical Risk',
      value: metrics?.critical?.toLocaleString() || '0',
      icon: <AlertTriangle className="text-red-500" size={24} />,
      bgColor: 'bg-white',
      textColor: 'text-gray-900',
      highlight: true
    },
    {
      title: 'Average Risk Score',
      value: `${metrics?.avgRisk || 0}%`,
      icon: <Activity className="text-orange-500" size={24} />,
      bgColor: 'bg-white',
      textColor: 'text-gray-900'
    },
    {
      title: 'Model Accuracy',
      value: `${metrics?.accuracy || 0}%`,
      icon: <Target className="text-green-500" size={24} />,
      bgColor: 'bg-white',
      textColor: 'text-gray-900'
    }
  ]

  return (
    <>
      {cards.map((card, i) => (
        <div
          key={i}
          className={`${card.bgColor} rounded-lg border ${card.highlight ? 'border-red-200 shadow-md' : 'border-gray-200 shadow-sm'} p-6 flex flex-col justify-between`}
        >
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-medium text-gray-500">{card.title}</h3>
            <div className={`p-2 rounded-md ${card.highlight ? 'bg-red-50' : 'bg-gray-50'}`}>
              {card.icon}
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className={`text-3xl font-bold ${card.textColor}`}>{card.value}</span>
          </div>
        </div>
      ))}
    </>
  )
}
