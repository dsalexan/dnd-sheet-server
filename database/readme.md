# IMPORTED

- bard.json
- college_of_lore.json
- features.json
- bard_features.json

# QUERIES

## Find slug

On view **dnd.slug**:

```
{ $or: [ {slug: <slug>}, {path: <slug>} ] }
```

Tem que ser assim porque a slug solo não fica no path (eu até posso colocar, mas nao coloquei)