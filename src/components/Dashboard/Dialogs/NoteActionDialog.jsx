import { LoadingButton } from "@mui/lab";
import { Card, Dialog, Fade, Grow, TextField, Zoom } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { isEqual } from "lodash";
import { useSnackbar } from "notistack";
import React, { useEffect, useState } from "react";
import { NOTE_TITLE_CHAR_LIMIT } from "../../../constants/input-limits";
import {
  createCategoryID,
  doCategoryNamesCollide,
  getOrCreateCategoryID,
} from "../../../helpers/notes/category";
import {
  createNote,
  updateNote,
} from "../../../helpers/requests/note-requests";
import { MODAL_ACTIONS } from "../../../models/dialogs";
import { variantFadeSlideUpSlow } from "../../../styles/animations/definitions";
import { dialogCard } from "../../../styles/components/dialogs";
import RemainingCharCount from "../SharedComponents/RemainingCharCount";
import RichTextArea from "../SharedComponents/RichTextArea";
import EditableCategoryChip from "./Components/EditableCategoryChip";
import SelectOrAddCategory from "./Components/SelectOrAddCategory";
import Titlebar from "./Components/Titlebar";

export default function NoteActionDialog({
  action,
  noteID,
  title,
  description,
  categoryName,
  categoryColor,
  categoriesCollection,
  setNoteCollection,
  setCategoriesCollection,
  dialogOpen,
  handleDialogClose,
}) {
  //#region Hooks
  const { enqueueSnackbar } = useSnackbar();

  // Tracks any changes to the current action being performed (edit, create, view, etc)
  const [currentAction, setCurrentAction] = useState(action);

  const [newTitle, setNewTitle] = useState(title);
  const [newDescription, setNewDescription] = useState(description);
  const [newCategoryName, setNewCategoryName] = useState(categoryName);
  const [newCategoryColor, setNewCategoryColor] = useState(categoryColor);
  const [displayCategoryChip, setDisplayCategoryChip] = useState(
    !!categoryName
  );
  const [isCategoryNew, setIsCategoryNew] = useState(false);

  useEffect(() => {
    setCurrentAction(action);
    setNewTitle(title);
    setNewDescription(description);
    setNewCategoryName(categoryName);
    setNewCategoryColor(categoryColor);
    setDisplayCategoryChip(!!categoryName);
  }, [action, title, description, categoryName, categoryColor]);
  //#endregion

  //#region Query Handling Hooks
  const { mutate: mutateEdit, status: editStatus } = useMutation(updateNote, {
    onSuccess: ({ data }) => {
      handleDialogClose();
      // Reflect the database changes on the front-end
      setNoteCollection(data.noteItem.notes.reverse());
      setCategoriesCollection(data.noteItem.categories);
      setIsCategoryNew(false); // Reset the flag. If a new category was created, it is not new anymore
    },
    onError: (error) => {
      console.error(error.message);
      enqueueSnackbar("An error occurred while saving the edited note", {
        variant: "error",
      });
    },
  });

  const { mutate: mutateCreate, status: createStatus } = useMutation(
    createNote,
    {
      onSuccess: ({ data }) => {
        handleDialogClose();
        // Reflect the database changes on the front-end
        setNoteCollection(data.noteItem.notes.reverse());
        setCategoriesCollection(data.noteItem.categories);
        handleResetModalValues(); // Only reset on successful note creation
      },
      onError: (error) => {
        console.error(error.message);
        enqueueSnackbar("An error occurred while creating the note", {
          variant: "error",
        });
      },
    }
  );
  //#endregion
  //#endregion

  //#region Helper Functions
  // Reset modal values is used when creating or editing a note
  // If keepCurrentAction is true, it means that we don't want to reset the current action (e.g. when resetting the values)
  const handleResetModalValues = (keepCurrentAction = false) => {
    if (!keepCurrentAction) {
      setCurrentAction(action);
    }
    setNewTitle(title);
    setNewDescription(description);
    setNewCategoryName(categoryName);
    setNewCategoryColor(categoryColor);
    setDisplayCategoryChip(!!categoryName);
    setIsCategoryNew(false);
  };
  //#endregion

  //#region Handlers
  const handleActionChange = (newAction) => {
    setCurrentAction(newAction);
  };

  const handleCreateNote = () => {
    const newNote = {
      title: newTitle.trim(),
      description: newDescription,
      category: {
        id: getOrCreateCategoryID(categoriesCollection, newCategoryName.trim()),
        name: newCategoryName.trim(),
        color: newCategoryColor || "none",
      },
      tags: [],
    };
    mutateCreate(newNote);
  };

  const handleEditNote = () => {
    // If no changes made, no database request necessary
    if (valuesChanged) {
      const editedNote = {
        noteID: Number(noteID),
        title: newTitle.trim(),
        description: newDescription,
        category: {
          id: getOrCreateCategoryID(
            categoriesCollection,
            newCategoryName.trim()
          ),
          name: displayCategoryChip ? newCategoryName.trim() : "", // Ensure we don't send the temporary category name
          color: newCategoryColor,
        },
        tags: [],
      };
      mutateEdit(editedNote);
    } else {
      handleDialogClose();
    }
  };

  const handleCategoryChipDelete = () => {
    setNewCategoryName("");
    setNewCategoryColor("none");
    setDisplayCategoryChip(false);
    setIsCategoryNew(false);
  };

  const handleAfterModalClose = (event = {}, reason = "") => {
    if (reason === "closeModal" || !valuesChanged) {
      handleResetModalValues();
    }
  };
  //#endregion

  //#region Derived State Variables
  // Short variable names for the current action being performed
  const isViewing = currentAction === MODAL_ACTIONS.VIEW;
  const isEditing = currentAction === MODAL_ACTIONS.EDIT;
  const isCreating = currentAction === MODAL_ACTIONS.CREATE_NOTE;
  // modified categories collection with the new category
  let modifiedCategoriesCollection = [...categoriesCollection];
  if (isCategoryNew) {
    modifiedCategoriesCollection = [
      ...modifiedCategoriesCollection,
      {
        id: createCategoryID(categoriesCollection),
        name: newCategoryName,
        color: newCategoryColor,
      },
    ];
  }
  // Input validation
  const titleError = newTitle.trim() === "";
  const valuesChanged =
    newTitle.trim() !== title ||
    !isEqual(newDescription, description) ||
    newCategoryName.trim() !== categoryName ||
    newCategoryColor !== categoryColor;
  const saveDisabled =
    titleError ||
    !valuesChanged ||
    doCategoryNamesCollide(modifiedCategoriesCollection);
  //#endregion

  return (
    <Dialog
      open={dialogOpen}
      onClose={handleDialogClose}
      TransitionComponent={Grow}
      TransitionProps={{ onExited: () => handleAfterModalClose() }}
      closeAfterTransition
    >
      <Card sx={dialogCard}>
        <Titlebar
          action={currentAction}
          title={
            (isViewing && "Viewing Note") ||
            (isEditing && "Editing Note") ||
            (isCreating && "Creating a Note")
          }
          disableRevert={!valuesChanged}
          onClose={() => {
            handleDialogClose();
            setTimeout(() => {
              handleResetModalValues();
            }, 250);
          }}
          onActionChange={handleActionChange}
          onRevert={handleResetModalValues}
        />

        <TextField
          required
          hiddenLabel
          disabled={currentAction === MODAL_ACTIONS.VIEW}
          value={newTitle}
          placeholder={"Type the note title here..."}
          InputProps={{
            endAdornment: !isViewing && (
              <RemainingCharCount
                stringLength={newTitle.length}
                characterLimit={NOTE_TITLE_CHAR_LIMIT}
                onlyDisplayAfterError
              />
            ),
          }}
          inputProps={{
            maxLength: NOTE_TITLE_CHAR_LIMIT,
          }}
          onChange={(event) => setNewTitle(event.target.value)}
          sx={{ my: "1em", transition: "all 0.2s ease-in-out" }}
        />

        <div style={{ marginBottom: "1rem" }}>
          {/*<TextField*/}
          {/*  disabled={currentAction === MODAL_ACTIONS.VIEW}*/}
          {/*  id="outlined-multiline-static"*/}
          {/*  label={"Description"}*/}
          {/*  value={newDescription}*/}
          {/*  multiline*/}
          {/*  minRows={minDescriptionRows}*/}
          {/*  maxRows={maxDescriptionRows}*/}
          {/*  sx={{ mb: "1em" }}*/}
          {/*  inputProps={{ maxLength: NOTE_DESCRIPTION_CHAR_LIMIT }}*/}
          {/*  onChange={(event) => setNewDescription(event.target.value)}*/}
          {/*/>*/}
          <RichTextArea
            content={newDescription}
            setContent={setNewDescription}
            placeholder={"Type the content of your note here..."}
            editable={currentAction !== MODAL_ACTIONS.VIEW}
            styles={{
              minHeight: "12rem",
              maxHeight: "50vh",
            }}
          />
        </div>

        {/* Display either the category chip or the search category component based on the user intended action */}
        {displayCategoryChip && (
          <motion.div
            variants={variantFadeSlideUpSlow}
            initial={"hidden"}
            animate={"visible"}
          >
            <EditableCategoryChip
              categoryName={newCategoryName}
              categoryColor={newCategoryColor}
              setCategoryName={setNewCategoryName}
              setCategoryColor={setNewCategoryColor}
              categoryCollection={modifiedCategoriesCollection}
              enableEdit={isCategoryNew} // Enable edit if category is new
              onDelete={!isViewing ? handleCategoryChipDelete : null}
            />
          </motion.div>
        )}
        {!displayCategoryChip && (isCreating || isEditing) && (
          <Fade in>
            <div>
              <SelectOrAddCategory
                categoriesCollection={categoriesCollection}
                categoryName={newCategoryName}
                setCategoryName={setNewCategoryName}
                setCategoryColor={setNewCategoryColor}
                setIsCategoryNew={setIsCategoryNew}
                setDisplayCategoryChip={setDisplayCategoryChip}
              />
            </div>
          </Fade>
        )}

        <Zoom in={isCreating || isEditing} unmountOnExit>
          <LoadingButton
            loading={editStatus === "loading" || createStatus === "loading"}
            variant="contained"
            size="small"
            disabled={saveDisabled} // Disable button if required title field is empty
            onClick={isEditing ? handleEditNote : handleCreateNote}
            sx={{
              border: "1px",
              mt: 2,
              ml: "auto",
            }}
          >
            {isEditing && "Save"}
            {isCreating && "Create"}
          </LoadingButton>
        </Zoom>
      </Card>
    </Dialog>
  );
}
