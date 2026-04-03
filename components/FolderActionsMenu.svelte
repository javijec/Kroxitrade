<script lang="ts">
  import { languageStore, translate } from "~lib/services/i18n";
  import { settings } from "~lib/services/settings";
  import type { BookmarksFolderStruct } from "~lib/types/bookmarks";
  import ActionsMenu from "./ActionsMenu.svelte";

  import editIcon from "data-text:lucide-static/icons/pencil.svg";
  import copyIcon from "data-text:lucide-static/icons/copy.svg";
  import uploadIcon from "data-text:lucide-static/icons/upload.svg";
  import trashIcon from "data-text:lucide-static/icons/trash-2.svg";
  import archiveIcon from "data-text:lucide-static/icons/archive.svg";
  import archiveRestoreIcon from "data-text:lucide-static/icons/archive-restore.svg";
  import moreIcon from "data-text:lucide-static/icons/more-horizontal.svg";

  export let folder: BookmarksFolderStruct;
  export let onRename: () => void;
  export let onArchive: () => void;
  export let onExport: () => void;
  export let onDuplicate: () => void;
  export let onDelete: () => void;

  const icons = {
    edit: editIcon,
    copy: copyIcon,
    upload: uploadIcon,
    trash: trashIcon,
    archive: archiveIcon,
    archiveRestore: archiveRestoreIcon,
    more: moreIcon
  };

  $: actions = [
    {
      id: "rename",
      icon: icons.edit,
      labelKey: "folder.renameFolder",
      handler: onRename
    },
    {
      id: "archive",
      icon: folder.archivedAt ? icons.archiveRestore : icons.archive,
      customLabel: folder.archivedAt
        ? translate($languageStore, "folder.restoreFolder")
        : translate($languageStore, "folder.archiveFolder"),
      handler: onArchive
    },
    {
      id: "export",
      icon: icons.upload,
      labelKey: "folder.exportFolder",
      handler: onExport
    },
    {
      id: "duplicate",
      icon: icons.copy,
      labelKey: "folder.duplicateFolder",
      handler: onDuplicate
    },
    {
      id: "delete",
      icon: icons.trash,
      labelKey: "folder.deleteFolder",
      handler: onDelete,
      danger: true
    }
  ];

  const PRIMARY_ACTION_IDS = ["rename", "delete"];
</script>

<ActionsMenu
  {actions}
  primaryActionIds={PRIMARY_ACTION_IDS}
  compactMode={$settings.compactActionsMenu}
  translate={(key) => translate($languageStore, key)}
  dropdownLabel={translate($languageStore, "folder.actionsMenu")}
  dropdownIcon={icons.more}
/>