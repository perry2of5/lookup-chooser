import type {
  LookupCategory,
  LookupHint,
  LookupResolvedValue,
  LookupService,
  LookupSubTarget,
  LookupTarget
} from "./LookupService";

type StubCategory = LookupCategory & {
  targets: Array<LookupTarget & { subTargets: Array<LookupSubTarget & { value: string }> }>;
};

const DATA: StubCategory[] = [
  {
    id: "secrets",
    label: "Secrets",
    icon: "S",
    targets: [
      {
        id: "secret-name-1",
        label: "Secret Name 1",
        description: "Application credentials",
        subTargets: [
          { id: "username", label: "Username", valueType: "text", masked: false, value: "app_user" },
          { id: "password", label: "Password", valueType: "password", masked: true, value: "app_pw_123" }
        ]
      },
      {
        id: "s3secret",
        label: "S3 Secret",
        description: "S3 access credentials",
        subTargets: [
          { id: "username", label: "Access Key ID", valueType: "text", masked: false, value: "AKIAIOSFODNN7EXAMPLE" },
          { id: "password", label: "Secret Access Key", valueType: "password", masked: true, value: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" }
        ]
      },
      {
        id: "client-ssh-server",
        label: "Client SSH Server",
        description: "SSH credentials",
        subTargets: [
          { id: "username", label: "Username", valueType: "text", masked: false, value: "ssh_user" },
          { id: "password", label: "Password", valueType: "password", masked: true, value: "ssh_pw_secret" }
        ]
      }
    ]
  },
  {
    id: "general",
    label: "General",
    icon: "G",
    targets: [
      {
        id: "host-connection-1",
        label: "Production Server",
        description: "Primary production host",
        subTargets: [
          { id: "hostname", label: "Hostname", valueType: "text", masked: false, value: "prod.example.com" },
          { id: "port", label: "Port", valueType: "number", masked: false, value: "22" },
          { id: "default-path", label: "Default Path", valueType: "text", masked: false, value: "/var/www/html" }
        ]
      },
      {
        id: "host-connection-2",
        label: "Staging Server",
        description: "Staging host",
        subTargets: [
          { id: "hostname", label: "Hostname", valueType: "text", masked: false, value: "staging.example.com" },
          { id: "port", label: "Port", valueType: "number", masked: false, value: "22" },
          { id: "default-path", label: "Default Path", valueType: "text", masked: false, value: "/var/www/staging" }
        ]
      }
    ]
  }
];

function applyHintToTargets(targets: LookupTarget[], hint?: LookupHint): LookupTarget[] {
  if (!hint?.targetAllowList || hint.targetAllowList.length === 0) {
    return targets;
  }
  return targets.filter((target) => hint.targetAllowList?.includes(target.id));
}

export class StubLookupService implements LookupService {
  async getCategories(hint?: LookupHint): Promise<LookupCategory[]> {
    const categories = DATA.map(({ targets: _targets, ...category }) => category);
    if (!hint?.categoryAllowList || hint.categoryAllowList.length === 0) {
      return categories;
    }
    return categories.filter((category) => hint.categoryAllowList?.includes(category.id));
  }

  async getTargets(categoryId: string, hint?: LookupHint): Promise<LookupTarget[]> {
    const category = DATA.find((c) => c.id === categoryId);
    if (!category) {
      return [];
    }
    return applyHintToTargets(
      category.targets.map(({ subTargets: _subTargets, ...target }) => target),
      hint
    );
  }

  async getSubTargets(categoryId: string, targetId: string, hint?: LookupHint): Promise<LookupSubTarget[]> {
    const category = DATA.find((c) => c.id === categoryId);
    const target = category?.targets.find((t) => t.id === targetId);
    if (!target) {
      return [];
    }
    return target.subTargets.filter((subTarget) => {
      if (!hint?.valueType) {
        return true;
      }
      return subTarget.valueType === hint.valueType;
    });
  }

  async resolveValue(categoryId: string, targetId: string, subTargetId: string): Promise<LookupResolvedValue> {
    const category = DATA.find((c) => c.id === categoryId);
    const target = category?.targets.find((t) => t.id === targetId);
    const subTarget = target?.subTargets.find((s) => s.id === subTargetId);

    if (!category || !target || !subTarget) {
      throw new Error("Lookup item not found");
    }

    return {
      value: subTarget.value,
      lookupPath: `lookup:${category.label}/${target.label}/${subTarget.label}`
    };
  }
}
