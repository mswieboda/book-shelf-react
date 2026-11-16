Pages:
- Shelf
  - Header Links (My Shelf | Search | Darkmode toggle)
    states:
    - pages/links - URL states
    - darkmode - shared client state

  - FilterBar (all, want, reading, done, sort)
    states:
    - counts for each - server
    - sort - local or shared client state
    - selected filter - local

  - ShelfList
    states:
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

- Search
  - SearchInput
    states:
    - searchText - string

  - SearchResults
    states:
    - limit - local (set to 5?)
    - max items - local
    - pagination - local/server

    - SearchItem (collection item)
      states:
      - book (see above)
      - inLibrary - bool - local/server

      - actions:
        - add to Library, remove from Library (toggle)
