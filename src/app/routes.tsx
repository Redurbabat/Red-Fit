import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { LoadingState } from "../components/feedback/states";
import { AppShell } from "./AppShell";
import { StartRedirect } from "./StartRedirect";

/* Feature pages are lazy-loaded so the shell paints immediately. */
const OnboardingPage = lazy(() => import("../features/onboarding/OnboardingPage"));
const TodayPage = lazy(() => import("../features/today/TodayPage"));
const TrainingPage = lazy(() => import("../features/training/TrainingPage"));
const PlanListPage = lazy(() => import("../features/training/plans/PlanListPage"));
const PlanEditorPage = lazy(() => import("../features/training/plans/PlanEditorPage"));
const ExerciseListPage = lazy(() => import("../features/training/exercises/ExerciseListPage"));
const ExerciseDetailPage = lazy(() => import("../features/training/exercises/ExerciseDetailPage"));
const WorkoutPage = lazy(() => import("../features/training/workout/WorkoutPage"));
const WorkoutSummaryPage = lazy(() => import("../features/training/workout/WorkoutSummaryPage"));
const NutritionPage = lazy(() => import("../features/nutrition/NutritionPage"));
const FoodListPage = lazy(() => import("../features/nutrition/foods/FoodListPage"));
const FoodFormPage = lazy(() => import("../features/nutrition/foods/FoodFormPage"));
const AddMealPage = lazy(() => import("../features/nutrition/meals/AddMealPage"));
const ScanPage = lazy(() => import("../features/nutrition/scan/ScanPage"));
const MealPlanPage = lazy(() => import("../features/nutrition/meal-plan/MealPlanPage"));
const ProgressPage = lazy(() => import("../features/progress/ProgressPage"));
const BodyPage = lazy(() => import("../features/progress/body/BodyPage"));
const BodyHomePage = lazy(() => import("../features/body/BodyHomePage"));
const PhotosPage = lazy(() => import("../features/body/PhotosPage"));
const ShoppingPage = lazy(() => import("../features/shopping/ShoppingPage"));
const RecipesPage = lazy(() => import("../features/recipes/RecipesPage"));
const MorePage = lazy(() => import("../features/more/MorePage"));
const CoachPage = lazy(() => import("../features/coach/CoachPage"));
const DiagnosticsPage = lazy(() => import("../features/more/DiagnosticsPage"));
const BackupPage = lazy(() => import("../features/backup/BackupPage"));
const SettingsPage = lazy(() => import("../features/settings/SettingsPage"));
const PrivacyPage = lazy(() => import("../features/more/PrivacyPage"));
const AboutPage = lazy(() => import("../features/more/AboutPage"));
const ThreeDDemoPage = lazy(() => import("../features/more/ThreeDDemoPage"));

function page(node: ReactNode): ReactNode {
  return <Suspense fallback={<LoadingState rows={4} />}>{node}</Suspense>;
}

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <StartRedirect /> },
      { path: "/onboarding", element: page(<OnboardingPage />) },
      { path: "/today", element: page(<TodayPage />) },

      { path: "/training", element: page(<TrainingPage />) },
      { path: "/training/plans", element: page(<PlanListPage />) },
      { path: "/training/plans/new", element: page(<PlanEditorPage />) },
      { path: "/training/plans/:planId", element: page(<PlanEditorPage />) },
      { path: "/training/exercises", element: page(<ExerciseListPage />) },
      { path: "/training/exercises/:exerciseId", element: page(<ExerciseDetailPage />) },
      { path: "/training/workout/:workoutId", element: page(<WorkoutPage />) },
      { path: "/training/workout/:workoutId/summary", element: page(<WorkoutSummaryPage />) },

      { path: "/nutrition", element: page(<NutritionPage />) },
      { path: "/nutrition/foods", element: page(<FoodListPage />) },
      { path: "/nutrition/foods/new", element: page(<FoodFormPage />) },
      { path: "/nutrition/foods/:foodId", element: page(<FoodFormPage />) },
      { path: "/nutrition/meals/add", element: page(<AddMealPage />) },
      { path: "/nutrition/scan", element: page(<ScanPage />) },
      { path: "/nutrition/meal-plan", element: page(<MealPlanPage />) },

      { path: "/body", element: page(<BodyHomePage />) },
      { path: "/body/measurements", element: page(<BodyPage />) },
      { path: "/body/photos", element: page(<PhotosPage />) },
      { path: "/progress", element: page(<ProgressPage />) },
      // Pre-2031 deep link — Körperwerte moved under the Körper tab.
      { path: "/progress/body", element: <Navigate to="/body/measurements" replace /> },

      { path: "/shopping", element: page(<ShoppingPage />) },
      { path: "/recipes", element: page(<RecipesPage />) },

      { path: "/more", element: page(<MorePage />) },
      { path: "/coach", element: page(<CoachPage />) },
      { path: "/diagnostics", element: page(<DiagnosticsPage />) },
      { path: "/backup", element: page(<BackupPage />) },
      { path: "/settings", element: page(<SettingsPage />) },
      { path: "/privacy", element: page(<PrivacyPage />) },
      { path: "/about", element: page(<AboutPage />) },
      { path: "/3d-demo", element: page(<ThreeDDemoPage />) },

      // Unknown routes never break the app.
      { path: "*", element: <Navigate to="/today" replace /> },
    ],
  },
]);
