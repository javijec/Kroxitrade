<script lang="ts">
  import { languageStore, translate } from "~lib/services/i18n";
  import { settings } from "~lib/services/settings";
  import type { BookmarksTradeStruct } from "~lib/types/bookmarks";
  import ActionsMenu from "./ActionsMenu.svelte";

  import editIcon from "data-text:lucide-static/icons/pencil.svg";
  import replaceIcon from "data-text:lucide-static/icons/refresh-cw.svg";
  import copyIcon from "data-text:lucide-static/icons/copy.svg";
  import checkIcon from "data-text:lucide-static/icons/check.svg";
  import trashIcon from "data-text:lucide-static/icons/trash-2.svg";
  import moreIcon from "data-text:lucide-static/icons/more-horizontal.svg";

  export let trade: BookmarksTradeStruct;
  export let onEdit: () => void;
  export let onReplace: () => void;
  export let onCopy: () => void;
  export let onToggle: () => void;
  export let onDelete: () => void;

  const icons = {
    edit: editIcon,
    replace: replaceIcon,
    copy: copyIcon,
    toggle: checkIcon,
    delete: trashIcon,
    more: moreIcon
  };

  const getLabel = (labelKey: string, isToggle = false) => {
    if (isToggle) {
      return trade.completedAt
        ? translate($languageStore, "folder.markPending")
        : translate($languageStore, "folder.markComplete");
    }
    return translate($languageStore, `folder.${labelKey}`);
  };

  $: actions = [
    {
      id: "edit",
      icon: icons.edit,
      labelKey: "editSearchName",
      handler: onEdit
    },
    {
      id: "replace",
      icon: icons.replace,
      labelKey: "replaceCurrentSearch",
      handler: onReplace
    },
    {
      id: "copy",
      icon: icons.copy,
      labelKey: "copyUrl",
      handler: onCopy
    },
    {
      id: "toggle",
      icon: icons.toggle,
      labelKey: "markComplete",
      handler: onToggle,
      isToggle: true
    },
    {
      id: "delete",
      icon: icons.delete,
      labelKey: "deleteTrade",
      handler: onDelete,
      danger: true
    }
  ].map((action) => ({
    ...action,
    customLabel: getLabel(action.labelKey, action.isToggle)
  }));

  const PRIMARY_ACTION_IDS = ["edit", "toggle", "delete"];
</script>

<ActionsMenu
  {actions}
  primaryActionIds={PRIMARY_ACTION_IDS}
  compactMode={$settings.compactActionsMenu}
  translate={(key) => translate($languageStore, key)}
  dropdownLabel={translate($languageStore, "folder.actionsMenu")}
  dropdownIcon={icons.more}
/>