Shared:
- Header Links (My Shelf | Search | Darkmode toggle)
    states:
    - pages/links - URL page links
    - darkmode - shared client state

Pages:
- ShelfPage
  states:
  - selectedFilter - local / URL query
  - sort - local / URL query

  - FilterBar (all, want, reading, done, sort)
    states:
    - counts for each - server (derived/computed)
    - sort (from parent)
    - selected filter (from parent)

  - ShelfList
    states:
    - sort (from parent)
    - selected filter (from parent)
    - bookList - server (see book below)
    - max items - local
    - pagination (TBD) - local/server

    - ShelfItem (collection item)
      states:
      - book - server
        - key - string
        - image - integer key (from API response) or possibly URL / raw data
        - title - string
        - author - string
        - yearPublished - num
      - status - server

      - actions:
        - switch status
        - delete

- SearchPage
  - searchText - local (will move to URL query string)

  - SearchInput
    states:
    - searchText (from parent)

  - SearchResults
    states:
    - searchText (from parent, if needed)
    - limit - local (set to 5?)
    - max items - local
    - pagination - local/server

    - SearchItem (collection item)
      states:
      - book (see above)
      - inLibrary - bool - server (derived/computed)

      - actions:
        - add to Library, remove from Library (toggle)
