'use client';

import { useState } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import { StockDayManagement } from '@/components/stock-days/stock-day-management';
import { StockDayHistory } from '@/components/stock-days/stock-day-history';

export default function StockDaysPage() {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <div>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Current Stock Day" />
          <Tab label="History & Review" />
        </Tabs>
      </Box>
      
      {tabValue === 0 && <StockDayManagement />}
      {tabValue === 1 && <StockDayHistory />}
    </div>
  );
}