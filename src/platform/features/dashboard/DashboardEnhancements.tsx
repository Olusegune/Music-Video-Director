/**
 * Dashboard Enhancements - Recent projects, quick actions, onboarding
 */

import { Plus, Zap, BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/platform/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/platform/components/ui/card";
import { useAppStore } from "@/platform/store/useAppStore";

export function RecentProjectsWidget({ projects }: { projects: any[] }) {
  const { openModuleProject } = useAppStore();

  if (projects.length === 0) {
    return null;
  }

  const recent = projects.slice(0, 5).sort((a, b) => {
    const dateA = new Date(a.updatedAt).getTime();
    const dateB = new Date(b.updatedAt).getTime();
    return dateB - dateA;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Recent Projects
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {recent.map((project) => (
          <button
            key={project.id}
            onClick={() => {
              const moduleId =
                project.type === "mv"
                  ? "musicvideo"
                  : project.type === "web"
                  ? "web"
                  : "motion";
              openModuleProject(moduleId, project.id);
            }}
            className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate group-hover:text-primary">
                  {project.name}
                </p>
                <p className="text-xs text-muted">
                  {new Date(project.updatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

export function QuickActionCards() {
  const {
    openWebStudio,
    openMvDirector,
    openMotionStudio,
    openGlamStudio,
  } = useAppStore();

  const actions = [
    {
      label: "New Web Project",
      description: "Create a website with AI presets",
      icon: "🌐",
      action: openWebStudio,
      color: "bg-green-500/10",
    },
    {
      label: "New Music Video",
      description: "Direct a music video with AI",
      icon: "🎵",
      action: openMvDirector,
      color: "bg-violet-500/10",
    },
    {
      label: "New Motion Project",
      description: "Create animations and choreography",
      icon: "✨",
      action: openMotionStudio,
      color: "bg-cyan-500/10",
    },
    {
      label: "New Glam Studio",
      description: "Design character looks and fashion",
      icon: "✨",
      action: openGlamStudio,
      color: "bg-gold-500/10",
    },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Start Something New</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.action}
            className={`text-left p-4 rounded-lg border border-border transition-all hover:border-primary/50 hover:bg-primary/5 group`}
          >
            <div className="text-2xl mb-2">{action.icon}</div>
            <p className="font-medium text-sm group-hover:text-primary transition-colors">
              {action.label}
            </p>
            <p className="text-xs text-muted mt-1">{action.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

export function OnboardingCard() {
  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          Welcome to MotionForge AI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          MotionForge AI is your complete creative platform for generating videos, websites, and visual content.
        </p>
        <div className="space-y-2">
          <div className="flex gap-2">
            <span className="text-xs font-medium text-primary">1.</span>
            <p className="text-xs">
              <strong>Music Video Director</strong> - Create music videos with AI-generated choreography and visuals
            </p>
          </div>
          <div className="flex gap-2">
            <span className="text-xs font-medium text-primary">2.</span>
            <p className="text-xs">
              <strong>Web Studio</strong> - Generate websites with 24+ design presets
            </p>
          </div>
          <div className="flex gap-2">
            <span className="text-xs font-medium text-primary">3.</span>
            <p className="text-xs">
              <strong>Glam Studio</strong> - Design character appearances, photography, and fashion
            </p>
          </div>
          <div className="flex gap-2">
            <span className="text-xs font-medium text-primary">4.</span>
            <p className="text-xs">
              <strong>Motion Studio</strong> - Create animations with choreography presets
            </p>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="secondary">
            Take Tour
          </Button>
          <Button size="sm" variant="ghost">
            Documentation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function EmptyStateDashboard() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
      <div>
        <div className="text-6xl mb-4">🚀</div>
        <h1 className="text-2xl font-bold">Welcome to MotionForge AI</h1>
        <p className="text-muted mt-2 max-w-md">
          Your complete creative studio for generating videos, websites, and visual content with AI.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-2xl">
        <QuickCreateButton
          label="Web Project"
          icon="🌐"
          description="24+ design presets"
        />
        <QuickCreateButton
          label="Music Video"
          icon="🎵"
          description="With choreography"
        />
        <QuickCreateButton
          label="Motion Project"
          icon="✨"
          description="Animations"
        />
        <QuickCreateButton
          label="Glam Studio"
          icon="💄"
          description="Character design"
        />
      </div>

      <Button size="lg" className="mt-4">
        <Plus className="w-4 h-4 mr-2" />
        Create Your First Project
      </Button>
    </div>
  );
}

function QuickCreateButton({
  label,
  icon,
  description,
}: {
  label: string;
  icon: string;
  description: string;
}) {
  return (
    <button className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-all group">
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-xs font-medium group-hover:text-primary">{label}</p>
      <p className="text-[10px] text-muted mt-1">{description}</p>
    </button>
  );
}
