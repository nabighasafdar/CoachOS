export type RootTabParamList = {
  Home: undefined;
  Plan: undefined;
  Log: undefined;
  Insights: undefined;
  Profile: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  Recovery: undefined;
  Nutrition: undefined;
  Scanner: {
    mealSlot?: string;
    mealLabel?: string;
  } | undefined;
};
