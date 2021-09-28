import { createState, Store } from '@ngneat/elf';
import { expectTypeOf } from 'expect-type';
import { selectAll, selectEntities, withEntities } from '..';
import { addEntities } from './add.mutation';
import { entitiesPropsFactory } from './entity.state';

const { cartEntitiesRef, withCartEntities } = entitiesPropsFactory('cart');

describe('entities props factory', () => {
  it('should create entities', () => {
    const { state, config } = createState(
      withCartEntities<{ title: string; id: number }>()
    );

    const store = new Store({ name: 'todos', config, state });

    store.reduce(
      addEntities({ id: 1, title: 'foo' }, { ref: cartEntitiesRef })
    );

    expect(store.getValue()).toMatchSnapshot();
  });

  it('should work with the default entities', () => {
    const { state, config } = createState(
      withEntities<{ id: string; label: string }>(),
      withCartEntities<{ title: string; id: number }>()
    );

    const store = new Store({ name: 'todos', config, state });

    store.reduce(
      addEntities({ id: '1', label: 'foo' }),
      addEntities({ id: 1, title: 'foo' }, { ref: cartEntitiesRef })
    );

    expect(store.getValue()).toMatchSnapshot();

    expectTypeOf(store.getValue()).toEqualTypeOf<{
      entities: Record<
        string,
        {
          id: string;
          label: string;
        }
      >;
      ids: string[];
      cartEntities: Record<
        number,
        {
          title: string;
          id: number;
        }
      >;
      cartIds: number[];
    }>();
  });

  it('should infer types', () => {
    const { state, config } = createState(
      withCartEntities<{ title: string; id: number }>()
    );

    const store = new Store({ name: 'todos', config, state });

    expectTypeOf(store.getValue()).toEqualTypeOf<{
      cartEntities: Record<
        number,
        {
          title: string;
          id: number;
        }
      >;
      cartIds: number[];
    }>();

    try {
      store.reduce(
        // @ts-expect-error - The deault entities isn't declared
        addEntities({ id: '1', label: 'foo' }),
        addEntities({ id: 1, title: 'foo' }, { ref: cartEntitiesRef })
      );
    } catch {
      //
    }

    store.reduce(
      // @ts-expect-error - id should be a number
      addEntities({ id: '1', title: 'foo' }, { ref: cartEntitiesRef }),
      // @ts-expect-error - nope isn't exists on type of cart entity
      addEntities({ id: 1, title: 'foo', nope: '' }, { ref: cartEntitiesRef })
    );
  });

  it('should work with multiple', () => {
    interface Actor {
      id: string;
      name: string;
    }

    interface Genre {
      id: string;
      name: string;
    }

    interface Movie {
      id: string;
      title: string;
      genres: Array<Genre['id']>;
      actors: Array<Actor['id']>;
    }

    const { actorsEntitiesRef, withActorsEntities } =
      entitiesPropsFactory('actors');
    const { genresEntitiesRef, withGenresEntities } =
      entitiesPropsFactory('genres');

    const { state, config } = createState(
      withEntities<Movie>(),
      withGenresEntities<Genre>(),
      withActorsEntities<Actor>()
    );

    const store = new Store({ name: 'movies', state, config });

    expect(store.getValue()).toMatchSnapshot();

    const spy = jest.fn();

    store
      .combine({
        movies: store.pipe(selectAll()),
        generes: store.pipe(selectEntities({ ref: genresEntitiesRef })),
        actors: store.pipe(selectEntities({ ref: actorsEntitiesRef })),
      })
      .subscribe((v) => {
        spy(v);

        expectTypeOf(v).toEqualTypeOf<{
          movies: Movie[];
          generes: Record<string, Genre>;
          actors: Record<string, Actor>;
        }>();
      });

    expect(spy).toHaveBeenCalledTimes(1);

    store.reduce(
      addEntities({ id: '1', name: 'foo' }, { ref: actorsEntitiesRef }),
      addEntities({ id: '1', name: 'foo' }, { ref: genresEntitiesRef }),
      addEntities({ id: '1', title: 'one', genres: ['1'], actors: ['1'] })
    );

    expect(store.getValue()).toMatchSnapshot();

    expect(spy).toHaveBeenCalledTimes(2);
  });
});
