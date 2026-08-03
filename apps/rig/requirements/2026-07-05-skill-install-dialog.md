# Skill Install Dialog

## Summary

The skill install dialog should describe the user's action in product language: installing a skill into an available provider.

## Background

Provider skill portability lets users take an existing skill from one provider and make it available in another provider. The UI should not expose filesystem paths or implementation-oriented source/target details for this common path.

## Key Decisions

- Use `Install skill` as the dialog title.
- Show the skill name as the primary context.
- Show the destination provider as `Install to`.
- Let the user choose the existing version with `Use version from`.
- Use a simple `Install` confirmation button.
- Hide source and target path previews from the default dialog.

## Future Considerations

- Add an advanced/details disclosure only if users need to inspect exact paths for troubleshooting.
